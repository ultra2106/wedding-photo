import { google } from 'googleapis'
import crypto from 'crypto'

// トークンを復号化
function decrypt(text) {
  const secret = process.env.NEXTAUTH_SECRET.padEnd(32, '0').slice(0, 32)
  const [ivHex, encryptedHex] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secret), iv)
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}

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

async function getDriveClientFromRefreshToken(encryptedRefreshToken) {
  const refreshToken = decrypt(encryptedRefreshToken)
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: refreshToken })
  await auth.getAccessToken()
  return google.drive({ version: 'v3', auth })
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const { eventId, table, role } = req.query

    // スプレッドシートからイベント情報を取得
    const serviceAuth = getServiceClient()
    const sheets = google.sheets({ version: 'v4', auth: serviceAuth })

    const sheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Events!A2:G',
    })

    const rows = sheetRes.data.values || []
    const eventRow = rows.find(row => row[1] === eventId)

    if (!eventRow) {
      return res.status(404).json({ error: 'イベントが見つかりません', photos: [] })
    }

    const rootFolderId = eventRow[5]
    const encryptedRefreshToken = eventRow[6]

    if (!encryptedRefreshToken) {
      return res.status(400).json({ error: 'トークンが見つかりません', photos: [] })
    }

    // 主催者のリフレッシュトークンでドライブクライアントを作成
    const drive = await getDriveClientFromRefreshToken(encryptedRefreshToken)

    // サブフォルダ一覧を取得
    const foldersRes = await drive.files.list({
      q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
    })

    const folders = foldersRes.data.files || []

    // アクセス可能なフォルダを決定
    let accessibleFolders = []
    if (role === 'host') {
      accessibleFolders = folders
    } else {
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

    photos.sort((a, b) => b.ts.localeCompare(a.ts))

    res.json({ photos })

  } catch (error) {
    console.error('Photos fetch error:', error)
    res.status(500).json({ error: '写真の取得に失敗しました', photos: [], detail: error.message })
  }
}
