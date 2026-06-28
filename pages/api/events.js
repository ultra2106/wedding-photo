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
      // L列（新郎新婦名）まで取得
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Events!A2:L',
      })
      const rows = response.data.values || []
      const events = rows
        .filter(row => row[0] === session.user.email && row[1])
        .map(row => ({
          id:             row[1],
          name:           row[2],
          date:           row[3],
          tables:         Number(row[4]),
          folderId:       row[5],
          tableNames:     row[7] ? JSON.parse(row[7]) : null,
          startTime:      row[8] || null,
          coverPhotoUrl:  row[9] || null,
          welcomeMessage: row[10] || '',
          coupleNames:    row[11] || '',
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

      // J:カバー写真URL, K:ウェルカムメッセージ, L:新郎新婦名 は作成時は空欄
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Events!A:L',
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
            startTime || '',
            '', // J: coverPhotoUrl
            '', // K: welcomeMessage
            '', // L: coupleNames
          ]]
        }
      })

      res.json({
        success: true,
        event: {
          id: eventId, name, date, tables, folderId: rootFolderId,
          tableNames: customNames, startTime,
          coverPhotoUrl: null, welcomeMessage: '', coupleNames: '',
        }
      })

    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'イベントの作成に失敗しました', detail: e.message })
    }
  }

  // 卓名・時間・カバー写真・ウェルカムメッセージ・新郎新婦名の更新
  if (req.method === 'PATCH') {
    try {
      const { eventId, tableNames, startTime, coverPhotoUrl, welcomeMessage, coupleNames } = req.body

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Events!A2:L',
      })
      const rows = response.data.values || []
      const rowIndex = rows.findIndex(row => row[1] === eventId && row[0] === session.user.email)

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'イベントが見つかりません' })
      }

      const existing = rows[rowIndex]
      const actualRow = rowIndex + 2

      // 渡されなかった項目は既存の値を維持する
      const nextTableNames     = tableNames !== undefined ? JSON.stringify(tableNames) : (existing[7] || '')
      const nextStartTime      = startTime !== undefined ? startTime : (existing[8] || '')
      const nextCoverPhotoUrl  = coverPhotoUrl !== undefined ? coverPhotoUrl : (existing[9] || '')
      const nextWelcomeMessage = welcomeMessage !== undefined ? welcomeMessage : (existing[10] || '')
      const nextCoupleNames    = coupleNames !== undefined ? coupleNames : (existing[11] || '')

      // H列〜L列をまとめて更新
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: `Events!H${actualRow}:L${actualRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            nextTableNames,
            nextStartTime,
            nextCoverPhotoUrl,
            nextWelcomeMessage,
            nextCoupleNames,
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
