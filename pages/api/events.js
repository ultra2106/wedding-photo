import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { google } from 'googleapis'

// スプレッドシートIDは環境変数から取得
const SHEET_ID = process.env.SPREADSHEET_ID

function getAuthClient(accessToken) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ access_token: accessToken })
  return auth
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'ログインが必要です' })

  const auth = getAuthClient(session.accessToken)
  const sheets = google.sheets({ version: 'v4', auth })
  const drive = google.drive({ version: 'v3', auth })

  // イベント一覧を取得
  if (req.method === 'GET') {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
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

      // 1. Googleドライブにルートフォルダを作成
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

      // 3. スプレッドシートにイベント情報を保存
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
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
      res.status(500).json({ error: 'イベントの作成に失敗しました' })
    }
  }
}
