import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { google } from 'googleapis'

function getServiceClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  })
  return auth
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'ログインが必要です' })

  const auth = getServiceClient()
  const sheets = google.sheets({ version: 'v4', auth })
  const drive = google.drive({ version: 'v3', auth })

  // イベント一覧を取得
  if (req.method === 'GET') {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Events!A2:F',
      })
      const rows = response.data.values || []

      // 自分のイベントだけ返す
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

      // 1. ルートフォルダを作成
      const rootFolder = await drive.files.create({
        requestBody: {
          name: `💍 ${name}`,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id'
      })
      const rootFolderId = rootFolder.data.id

      // 2. 卓ごとのサブフォルダを作成
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

      // 3. 主催者のGoogleドライブと共有
      // サービスアカウントが作ったフォルダを主催者も見られるように
      await drive.permissions.create({
        fileId: rootFolderId,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: session.user.email,
        }
      })

      // 4. スプレッドシートに保存
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Events!A:F',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            session.user.email,
            eventId,
            name,
            date,
            tables,
            rootFolderId,
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
