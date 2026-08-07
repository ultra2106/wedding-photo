import { adminAuth, adminDb } from '../../lib/firebase-admin'
import { google } from 'googleapis'

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
  if (req.method !== 'DELETE') return res.status(405).end()

  try {
    const { fileId, eventId, nick, isHost, idToken } = req.body
    if (!fileId || !eventId) return res.status(400).json({ error: '必須パラメータが不足しています' })

    // ホストの場合は認証必須
    let uid = null
    if (isHost) {
      if (!idToken) return res.status(401).json({ error: '認証が必要です' })
      const decoded = await adminAuth.verifyIdToken(idToken)
      uid = decoded.uid
    } else {
      // ゲストの場合はイベントのオーナーのUIDを取得
      const eventSnap = await adminDb.collection('events').doc(eventId).get()
      if (!eventSnap.exists) return res.status(404).json({ error: 'イベントが見つかりません' })
      const ownerEmail = eventSnap.data().ownerEmail
      // ownerEmailからuidを取得
      const ownerUser = await adminAuth.getUserByEmail(ownerEmail)
      uid = ownerUser.uid
    }

    const drive = await getDriveClient(uid)

    // ゲストの場合は自分の写真かチェック
    if (!isHost) {
      const file = await drive.files.get({
        fileId,
        fields: 'appProperties',
      })
      const fileNick = file.data.appProperties?.nick
      if (fileNick !== nick) {
        return res.status(403).json({ error: '自分が投稿した写真のみ削除できます' })
      }
    }

    await drive.files.update({
      fileId,
      requestBody: { trashed: true },
    })

    return res.json({ success: true })

  } catch (e) {
    console.error('Delete photo error:', e)
    return res.status(500).json({ error: '削除に失敗しました', detail: e.message })
  }
}
