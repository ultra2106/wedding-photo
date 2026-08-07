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
    const { eventId, idToken } = req.body
    if (!idToken) return res.status(401).json({ error: '認証が必要です' })

    const decoded = await adminAuth.verifyIdToken(idToken)

    // Firestoreからイベント取得
    const eventRef = adminDb.collection('events').doc(eventId)
    const eventSnap = await eventRef.get()

    if (!eventSnap.exists) return res.status(404).json({ error: 'イベントが見つかりません' })
    if (eventSnap.data().ownerEmail !== decoded.email) return res.status(403).json({ error: '権限がありません' })

    const { folderId } = eventSnap.data()

    // Googleドライブのフォルダをゴミ箱へ
    if (folderId) {
      try {
        const drive = await getDriveClient(decoded.uid)
        await drive.files.update({
          fileId: folderId,
          requestBody: { trashed: true },
        })
      } catch (e) {
        console.error('Drive folder delete error:', e)
        // Drive削除失敗しても続行
      }
    }

    // Firestoreからイベント削除
    await eventRef.delete()

    // 関連するreactions・comments・favoritesも削除
    const collections = ['reactions', 'comments', 'favorites']
    for (const col of collections) {
      const snap = await adminDb.collection(col).where('eventId', '==', eventId).get()
      const batch = adminDb.batch()
      snap.docs.forEach(d => batch.delete(d.ref))
      if (!snap.empty) await batch.commit()
    }

    return res.json({ success: true })

  } catch (e) {
    console.error('Delete event error:', e)
    return res.status(500).json({ error: 'イベントの削除に失敗しました', detail: e.message })
  }
}
