import { google } from 'googleapis'
import { Readable } from 'stream'

function getServiceClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive',
    ],
  })
  return auth
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { eventId, fileName, fileData, mimeType, group, caption, visibility, nick } = req.body

    // サービスアカウントでドライブに接続
    const auth = getServiceClient()
    const drive = google.drive({ version: 'v3', auth })

    // スプレッドシートからイベントのフォルダIDを取得
    const sheets = google.sheets({ version: 'v4', auth })
    const sheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Events!A2:F',
    })

    const rows = sheetRes.data.values || []
    const eventRow = rows.find(row => row[1] === eventId)

    if (!eventRow) {
      return res.status(404).json({ error: 'イベントが見つかりません' })
    }

    const rootFolderId = eventRow[5]

    // 保存先フォルダ名を決定
    let folderKeyword = ''
    if (visibility === 'public') {
      folderKeyword = '全体公開'
    } else if (group === 'afterparty') {
      folderKeyword = '二次会'
    } else if (group === 'host') {
      folderKeyword = '主催者'
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
          caption: caption || '',
          visibility: visibility || 'public',
          nick: nick || '',
          group: group || '',
          eventId: eventId || '',
        }
      },
      media: { mimeType, body: stream },
      fields: 'id, name, thumbnailLink, webContentLink'
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
