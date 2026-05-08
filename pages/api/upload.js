import { google } from 'googleapis'
import { Readable } from 'stream'
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

// リフレッシュトークンから新しいアクセストークンを発行
async function getDriveClientFromRefreshToken(encryptedRefreshToken) {
  const refreshToken = decrypt(encryptedRefreshToken)
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: refreshToken })
  // アクセストークンを自動更新
  await auth.getAccessToken()
  return google.drive({ version: 'v3', auth })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { eventId, fileName, fileData, mimeType, group, caption, visibility, nick } = req.body

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
      return res.status(404).json({ error: 'イベントが見つかりません' })
    }

    const rootFolderId = eventRow[5]
    const encryptedRefreshToken = eventRow[6]

    if (!encryptedRefreshToken) {
      return res.status(400).json({ error: 'トークンが見つかりません。主催者に再ログインを依頼してください。' })
    }

    // 主催者のリフレッシュトークンでドライブクライアントを作成
    const drive = await getDriveClientFromRefreshToken(encryptedRefreshToken)

    // 保存先フォルダを決定
    let folderKeyword = ''
    if (visibility === 'public') {
      folderKeyword = '全体公開'
    } else if (group === 'afterparty') {
      folderKeyword = '二次会'
    } else if (group === 'host') {
      folderKeyword = '主催者のみ'
    } else {
      const tableNum = group.replace('table', '')
      folderKeyword = `${tableNum}卓`
    }

    // サブフォルダを検索
    const folderSearch = await drive.files.list({
      q: `'${rootFolderId}' in parents and name contains '${folderKeyword}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
    })

    let folderId = rootFolderId
    if (folderSearch.data.files?.length > 0) {
      folderId = folderSearch.data.files[0].id
    }

    // Base64 → バイナリに変換してアップロード
    const buffer = Buffer.from(fileData, 'base64')
    const stream = Readable.from(buffer)

    const response = await drive.files.create({
      requestBody: {
        name: `${Date.now()}_${fileName}`,
        parents: [folderId],
        appProperties: {
          caption:    caption || '',
          visibility: visibility || 'public',
          nick:       nick || '',
          group:      group || '',
          eventId:    eventId || '',
        }
      },
      media: { mimeType, body: stream },
      fields: 'id, name, thumbnailLink'
    })

    // 誰でも見られるように共有設定
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: { role: 'reader', type: 'anyone' }
    })

    res.json({ success: true, file: response.data })

  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'アップロードに失敗しました', detail: error.message })
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
}
