import { google } from 'googleapis'

function getServiceClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ],
  })
  return auth
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const { eventId, table, role } = req.query

    const auth = getServiceClient()
    const drive = google.drive({ version: 'v3', auth })
    const sheets = google.sheets({ version: 'v4', auth })

    // スプレッドシートからイベントのフォルダIDを取得
    const sheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Events!A2:F',
    })

    const rows = sheetRes.data.values || []
    const eventRow = rows.find(row => row[1] === eventId)

    if (!eventRow) {
      return res.status(404).json({ error: 'イベントが見つかりません', photos: [] })
    }

    const rootFolderId = eventRow[5]

    // サブフォルダ一覧を取得
    const foldersRes = await drive.files.list({
      q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
    })

    const folders = foldersRes.data.files || []

    // アクセス可能なフォルダを決定
    let accessibleFolders = []

    if (role === 'host') {
      // 主催者は全フォルダ
      accessibleFolders = folders
    } else {
      // ゲストは「全体公開」と「自分の卓」のフォルダのみ
      const tableNum = table?.replace('table', '')
      accessibleFolders = folders.filter(f =>
        f.name.includes('全体公開') ||
        f.name.includes(`${tableNum}卓`) ||
        (table === 'afterparty' && f.name.includes('二次会'))
      )
    }

    // 各フォルダから写真を取得
    const results = await Promise.all(
      accessibleFolders.map(folder =>
        drive.files.list({
          q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
          fields: 'files(id, name, thumbnailLink, appProperties, createdTime)',
          orderBy: 'createdTime desc',
          pageSize: 100,
        }).then(r => r.data.files || [])
      )
    )

    // 整形して返す
    const photos = results.flat().map(f => ({
      id: f.id,
      url: f.thumbnailLink
        ? f.thumbnailLink.replace('=s220', '=s800')
        : `https://drive.google.com/thumbnail?id=${f.id}&sz=w800`,
      caption: f.appProperties?.caption || f.name,
      visibility: f.appProperties?.visibility || 'public',
      nick: f.appProperties?.nick || '不明',
      group: f.appProperties?.group || 'public',
      ts: new Date(f.createdTime).toLocaleTimeString('ja-JP', {
        hour: '2-digit', minute: '2-digit'
      }),
    }))

    // 時刻の新しい順に並び替え
    photos.sort((a, b) => b.ts.localeCompare(a.ts))

    res.json({ photos })

  } catch (error) {
    console.error('Photos fetch error:', error)
    res.status(500).json({ error: '写真の取得に失敗しました', photos: [], detail: error.message })
  }
}
