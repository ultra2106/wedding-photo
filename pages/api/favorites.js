import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
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

  // お気に入り一覧取得
  if (req.method === 'GET') {
    try {
      const { eventId } = req.query
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET,
        range: 'Favorites!A2:C',
      })
      const rows = response.data.values || []
      const favorites = rows
        .filter(row => row[0] === eventId && row[1])
        .map(row => row[1])
      res.json({ favorites })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'お気に入りの取得に失敗しました', favorites: [] })
    }
  }

  // お気に入り追加・解除
  if (req.method === 'POST') {
    try {
      const session = await getServerSession(req, res, authOptions)
      if (!session) return res.status(401).json({ error: 'ログインが必要です' })

      const { eventId, photoId } = req.body
      if (!eventId || !photoId) {
        return res.status(400).json({ error: '必須項目が不足しています' })
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET,
        range: 'Favorites!A2:C',
      })
      const rows = response.data.values || []
      const existingIndex = rows.findIndex(row => row[0] === eventId && row[1] === photoId)

      if (existingIndex !== -1) {
        // 既にある → 解除
        const actualRow = existingIndex + 2
        await sheets.spreadsheets.values.clear({
          spreadsheetId: SHEET,
          range: `Favorites!A${actualRow}:C${actualRow}`,
        })
        res.json({ success: true, action: 'removed' })
      } else {
        // ない → 追加
        await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET,
          range: 'Favorites!A:C',
          valueInputOption: 'RAW',
          requestBody: {
            values: [[eventId, photoId, new Date().toLocaleString('ja-JP')]]
          }
        })
        res.json({ success: true, action: 'added' })
      }
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'お気に入りの更新に失敗しました' })
    }
  }
}
