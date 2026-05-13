import { google } from 'googleapis'

function getServiceClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  return auth
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const { eventId } = req.query
    const auth = getServiceClient()
    const sheets = google.sheets({ version: 'v4', auth })

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Events!A2:H',
    })

    const rows = response.data.values || []
    const eventRow = rows.find(row => row[1] === eventId)

    if (!eventRow) {
      return res.status(404).json({ error: 'イベントが見つかりません' })
    }

    const tables = Number(eventRow[4]) || 4
    const tableNames = eventRow[7] ? JSON.parse(eventRow[7]) : Array.from({ length: tables }, (_, i) => `${i + 1}卓`)

    res.json({
      name:       eventRow[2],
      date:       eventRow[3],
      tables,
      tableNames,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'イベント情報の取得に失敗しました' })
  }
}
