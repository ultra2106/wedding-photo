import { google } from 'googleapis'

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

export default async function handler(req, res) {
  const auth = getServiceClient()
  const sheets = google.sheets({ version: 'v4', auth })
  const SHEET = process.env.SPREADSHEET_ID

  // コメント一覧取得
  if (req.method === 'GET') {
    try {
      const { eventId, table } = req.query
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET,
        range: 'Comments!A2:F',
      })
      const rows = response.data.values || []
      const comments = rows
        .filter(row => row[0] === eventId && (table === 'all' || row[1] === table))
        .map(row => ({
          id:        row[5],
          eventId:   row[0],
          table:     row[1],
          nick:      row[2],
          text:      row[3],
          createdAt: row[4],
        }))
        .reverse()
      res.json({ comments })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'コメントの取得に失敗しました', comments: [] })
    }
  }

  // コメント投稿
  if (req.method === 'POST') {
    try {
      const { eventId, table, nick, text } = req.body
      if (!eventId || !table || !nick || !text) {
        return res.status(400).json({ error: '必須項目が不足しています' })
      }
      const id = `cmt_${Date.now()}`
      const createdAt = new Date().toLocaleString('ja-JP')

      // Commentsシートがなければ自動作成される想定
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET,
        range: 'Comments!A:F',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[eventId, table, nick, text, createdAt, id]]
        }
      })
      res.json({ success: true, comment: { id, eventId, table, nick, text, createdAt } })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'コメントの投稿に失敗しました' })
    }
  }
}
