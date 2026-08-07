import { adminDb } from '../../lib/firebase-admin'
import { google } from 'googleapis'
import { Readable } from 'stream'

async function getDriveClient(uid) {
  const userSnap = await adminDb.collection('users').doc(uid).get()
  const accessToken = userSnap.data()?.accessToken
  if (!accessToken) throw new Error('アクセストークンが見つかりません。再ログインしてください。')
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ access_token: accessToken })
  return google.drive({ version: 'v3', auth })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { eventId, fileName, fileData, mimeType, group, caption, visibility, nick } = req.body
    if (!eventId || !fileData) return res.status(400).json({ error: '必須パラメータが不足しています' })

    // Firestoreからイベント情報取得
    const eventSnap = await adminDb.collection('events').doc(eventId).get()
    if (!eventSnap.exists) return res.status(404).json({ error: 'イベントが見つかりません' })

    const eventData = eventSnap.data()
    const rootFolderId = eventData.folderId
    const ownerEmail = eventData.ownerEmail

    // オーナーのuidを取得してDriveクライアントを取得
    const { adminAuth } = await import('../../lib/firebase-admin')
    const ownerUser = await adminAuth.getUserByEmail(ownerEmail)
    const drive = await getDriveClient(ownerUser.uid)

    // 保存先フォルダを決定
    let folderKeyword = ''
    if (visibility === 'public') {
      folderKeyword = '全体公開'
    } else if (group === 'afterparty') {
      folderKeyword = '二次会'
    } else if (visibility === 'host') {
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

    return res.json({ success: true, file: response.data })

  } catch (e) {
    console.error('Upload error:', e)
    return res.status(500).json({ error: 'アップロードに失敗しました', detail: e.message })
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
}
