import { google } from 'googleapis'

// 卓ごとのGoogleドライブフォルダID（後で設定します）
const FOLDER_IDS = {
  table1:     process.env.FOLDER_TABLE1,
  table2:     process.env.FOLDER_TABLE2,
  table3:     process.env.FOLDER_TABLE3,
  table4:     process.env.FOLDER_TABLE4,
  afterparty: process.env.FOLDER_AFTERPARTY,
  public:     process.env.FOLDER_PUBLIC,
}

// Googleドライブに接続する関数
function getDriveClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  })
  return google.drive({ version: 'v3', auth })
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const { role, table } = req.query
    const drive = getDriveClient()

    // 権限に応じて見せるフォルダを決定
    let folderIds = []
    if (role === 'host') {
      // 主催者は全フォルダ
      folderIds = Object.values(FOLDER_IDS).filter(Boolean)
    } else {
      // ゲストは「全体公開」＋「自分の卓」のフォルダだけ
      folderIds = [
        FOLDER_IDS.public,
        FOLDER_IDS[table],
      ].filter(Boolean)
    }

    // 各フォルダから写真を並行取得
    const results = await Promise.all(
      folderIds.map(folderId =>
        drive.files.list({
          q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
          fields: 'files(id, name, thumbnailLink, appProperties, createdTime)',
          orderBy: 'createdTime desc',
          pageSize: 100,
        }).then(r => r.data.files || [])
      )
    )

    // 全フォルダの結果をまとめて整形
    const photos = results.flat().map(f => ({
      id:         f.id,
      url:        f.thumbnailLink
                    ? f.thumbnailLink.replace('=s220', '=s800')
                    : `https://drive.google.com/thumbnail?id=${f.id}&sz=w800`,
      caption:    f.appProperties?.caption || f.name,
      visibility: f.appProperties?.visibility || 'public',
      nick:       f.appProperties?.nick || '不明',
      group:      f.appProperties?.group || 'public',
      ts:         new Date(f.createdTime).toLocaleTimeString('ja-JP', {
                    hour: '2-digit', minute: '2-digit'
                  }),
    }))

    // 時刻の新しい順に並び替え
    photos.sort((a, b) => b.ts.localeCompare(a.ts))

    res.json({ photos })

  } catch (error) {
    console.error('Photos fetch error:', error)
    res.status(500).json({ error: '写真の取得に失敗しました', photos: [] })
  }
}
