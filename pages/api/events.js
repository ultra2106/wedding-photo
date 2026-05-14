import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { google } from 'googleapis'
import crypto from 'crypto'

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

  // イベント一覧取得
  if (req.method === 'GET') {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Events!A2:I',
      })
      const rows = response.data.values || []
      const events = rows
        .filter(row => row[0] === session.user.email && row[1])
        .map(row => ({
          id:         row[1],
          name:       row[2],
          date:       row[3],
          tables:     Number(row[4]),
          folderId:   row[5],
          tableNames: row[7] ? JSON.parse(row[7]) : null,
          startTime:  row[8] || null,
        }))
      res.json({ events })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'イベントの取得に失敗しました', events: [] })
    }
  }

  // イベント作成
  if (req.method === 'POST') {
    try {
      const { name, date, tables, tableNames, startTime } = req.body
      const eventId = `evt_${Date.now()}`
      const drive = getUserDriveClient(session.accessToken)

      const customNames = tableNames || Array.from({ length: tables }, (_, i) => `${i + 1}卓`)

      const rootFolder = await drive.files.create({
        requestBody: {
          name: `💍 ${name}`,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id'
      })
      const rootFolderId = rootFolder.data.id

      const folderNames = [
        '📢 全体公開',
        ...customNames.map(n => `🌸 ${n}`),
        '🎉 二次会',
        '🔒 主催者のみ',
      ]
      await Promise.all(folderNames.map(fName =>
        drive.files.create({
          requestBody: {
            name: fName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [rootFolderId],
          }
        })
      ))

      const encryptedToken = encrypt(session.refreshToken)

      // I列に開始時間を保存
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Events!A:I',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            session.user.email,
            eventId,
            name,
            date,
            tables,
            rootFolderId,
            encryptedToken,
            JSON.stringify(customNames),
            startTime || '',  // 例: "17:00"
          ]]
        }
      })

      res.json({
        success: true,
        event: { id: eventId, name, date, tables, folderId: rootFolderId, tableNames: customNames, startTime }
      })

    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'イベントの作成に失敗しました', detail: e.message })
    }
  }

  // 卓名・時間の更新
  if (req.method === 'PATCH') {
    try {
      const { eventId, tableNames, startTime } = req.body

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Events!A2:I',
      })
      const rows = response.data.values || []
      const rowIndex = rows.findIndex(row => row[1] === eventId && row[0] === session.user.email)

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'イベントが見つかりません' })
      }

      const actualRow = rowIndex + 2

      // H列（卓名）とI列（開始時間）を更新
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: `Events!H${actualRow}:I${actualRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            JSON.stringify(tableNames),
            startTime || '',
          ]]
        }
      })

      res.json({ success: true })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: '更新に失敗しました', detail: e.message })
    }
  }
}
