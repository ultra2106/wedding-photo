import { google } from 'googleapis'
import { Readable } from 'stream'

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
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { fileName, fileData, mimeType, group, caption, visibility, nick } = req.body

    const drive = getDriveClient()

    // 保存先フォルダを決定（公開範囲に応じて振り分け）
    const folderId = visibility === 'public'
      ? FOLDER_IDS.public
      : FOLDER_IDS[group]

    if (!folderId) {
      return res.status(400).json({ error: 'フォルダIDが設定されていません' })
    }

    // Base64 → バイナリに変換
    const buffer = Buffer.from(fileData, 'base64')
    const stream = Readable.from(buffer)

    // Googleドライブに保存
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        appProperties: {
          caption:    caption || '',
          visibility: visibility || 'public',
          nick:       nick || '',
          group:      group || '',
        }
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, name, thumbnailLink, webContentLink'
    })

    // 全員が見られるように共有設定
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      }
    })

    res.json({ success: true, file: response.data })

  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'アップロードに失敗しました' })
  }
}

// 大きいファイルも受け付けるように設定
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}
