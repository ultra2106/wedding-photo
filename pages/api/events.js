import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { google } from 'googleapis'
import crypto from 'crypto'

// トークンを暗号化
function encrypt(text) {
  const secret = process.env.NEXTAUTH_SECRET.padEnd(32, '0').slice(0, 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secret), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function getServiceClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return auth
}

function getUserDriveClient(accessToken) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ access_token: accessToken })
  return google.drive({ version: 'v3', auth })
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'ログインが必要です' })

  const serviceAuth = getServiceClient()
  const sheets = google.sheets({ version: 'v4', auth: serviceAuth })
  const drive = getUserDriveClient(session.accessToken)

  // イベント一覧を取得
  if (req.method === 'GET') {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Events!A2:G',
      })
      const rows = response.data.values || []
      const events = rows
        .filter(row => row[0] === session.user.email)
        .map(row => ({
          id:       row[1],
          name:     row[2],
          date:     row[3],
          tables:   Number(row[4]),
          folderId: row[5],
        }))
      res.json({ events })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'イベントの取得に失敗しました', events: [] })
    }
  }

  // 新しいイベントを作成
  if (req.method === 'POST') {
    try {
      const { name, date, tables } = req.body
      const eventId = `evt_${Date.now()}`

      // 主催者のドライブにフォルダを作成
      const rootFolder = await drive.files.create({
        requestBody: {
          name: `💍 ${name}`,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id'
      })
      const rootFolderId = rootFolder.data.id

      // 卓ごとのサブフォルダを作成
      const tableNames = [
        '📢 全体公開',
        ...Array.from({ length: tables }, (_, i) => `🌸 ${i + 1}卓`),
        '🎉 二次会',
        '🔒 主催者のみ',
      ]
      await Promise.all(tableNames.map(tName =>
        drive.files.create({
          requestBody: {
            name: tName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [rootFolderId],
          }
        })
      ))

      // リフレッシュトークンを暗号化して保存
      const encryptedToken = encrypt(session.refreshToken)

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Events!A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            session.user.email,
            eventId,
            name,
            date,
            tables,
            rootFolderId,
            encryptedToken, // 暗号化したリフレッシュトークン
          ]]
        }
      })

      res.json({
        success: true,
        event: { id: eventId, name, date, tables, folderId: rootFolderId }
      })

    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'イベントの作成に失敗しました', detail: e.message })
    }
  }
}
