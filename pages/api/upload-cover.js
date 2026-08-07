import { adminAuth, adminDb } from '../../lib/firebase-admin'
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
    const { eventId, fileData, mimeType, idToken } = req.body
    if (!eventId || !fileData || !mimeType) return res.status(400).json({ error: '必須パラメータが不足しています' })
    if (!idToken) return res.status(401).json({ error: '認証が必要です' })

    const decoded = await adminAuth.verifyIdToken(idToken)

    // Firestoreからイベント取得・権限確認
    const eventRef = adminDb.collection('events').doc(eventId)
    const eventSnap = await eventRef.get()
    if (!eventSnap.exists) return res.status(404).json({ error: 'イベントが見つかりません' })
    if (eventSnap.data().ownerEmail !== decoded.email) return res.status(403).json({ error: '権限がありません' })

    const rootFolderId = eventSnap.data().folderId
    const drive = await getDriveClient(decoded.uid)

    // Base64 → バイナリに変換してアップロード（ルートフォルダ直下）
    const buffer = Buffer.from(fileData, 'base64')
    const stream = Readable.from(buffer)

    const created = await drive.files.create({
      requestBody: {
        name: `cover_${Date.now()}`,
        parents: [rootFolderId],
      },
      media: { mimeType, body: stream },
      fields: 'id, thumbnailLink',
    })

    // 誰でも見られるように共有設定
    await drive.permissions.create({
      fileId: created.data.id,
      requestBody: { role: 'reader', type: 'anyone' }
    })

    const coverPhotoUrl = created.data.thumbnailLink
      ? created.data.thumbnailLink.replace('=s220', '=s1600')
      : `https://drive.google.com/thumbnail?id=${created.data.id}&sz=w1600`

    // FirestoreのイベントにcoverPhotoUrlを保存
    await eventRef.update({ coverPhotoUrl })

    return res.json({ success: true, coverPhotoUrl })

  } catch (e) {
    console.error('Cover upload error:', e)
    return res.status(500).json({ error: 'カバー写真のアップロードに失敗しました', detail: e.message })
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
}
