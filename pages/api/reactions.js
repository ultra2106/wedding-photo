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

  // リアクション一覧取得
  if (req.method === 'GET') {
    try {
      const { eventId } = req.query
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET,
        range: 'Reactions!A2:E',
      })
      const rows = response.data.values || []

      // photoIdごとにリアクションを集計
      const reactMap = {}
      rows
        .filter(row => row[0] === eventId)
        .forEach(row => {
          const photoId = row[1]
          const nick = row[2]
          const reaction = row[3]
          if (!reactMap[photoId]) reactMap[photoId] = {}
          if (!reactMap[photoId][reaction]) reactMap[photoId][reaction] = []
          reactMap[photoId][reaction].push(nick)
        })

      res.json({ reactions: reactMap })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'リアクションの取得に失敗しました', reactions: {} })
    }
  }

  // リアクション投稿・取り消し
  if (req.method === 'POST') {
    try {
      const { eventId, photoId, nick, reaction } = req.body
      if (!eventId || !photoId || !nick || !reaction) {
        return res.status(400).json({ error: '必須項目が不足しています' })
      }

      // 既存のリアクションを取得
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET,
        range: 'Reactions!A2:E',
      })
      const rows = response.data.values || []

      // 同じユーザーが同じ写真に同じリアクションをしているか確認
      const existingIndex = rows.findIndex(
        row => row[0] === eventId && row[1] === photoId && row[2] === nick && row[3] === reaction
      )

      if (existingIndex !== -1) {
        // 既にある → 取り消し（行をクリア）
        const actualRow = existingIndex + 2
        await sheets.spreadsheets.values.clear({
          spreadsheetId: SHEET,
          range: `Reactions!A${actualRow}:E${actualRow}`,
        })
        res.json({ success: true, action: 'removed' })
      } else {
        // ない → 追加
        await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET,
          range: 'Reactions!A:E',
          valueInputOption: 'RAW',
          requestBody: {
            values: [[eventId, photoId, nick, reaction, new Date().toLocaleString('ja-JP')]]
          }
        })
        res.json({ success: true, action: 'added' })
      }
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'リアクションの投稿に失敗しました' })
    }
  }
}
