import { adminAuth, adminDb } from '../../lib/firebase-admin'

export default async function handler(req, res) {
  // ── お気に入り一覧取得 ────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { eventId } = req.query
      if (!eventId) return res.status(400).json({ error: 'eventIdが必要です' })

      const snap = await adminDb
        .collection('favorites')
        .where('eventId', '==', eventId)
        .get()

      const favorites = snap.docs.map(d => d.data().photoId)
      return res.json({ favorites })
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'お気に入りの取得に失敗しました', favorites: [] })
    }
  }

  // ── お気に入り追加・解除 ──────────────────────────────────
  if (req.method === 'POST') {
    try {
      // 主催者のみ操作可能
      const idToken = req.body?.idToken
      if (!idToken) return res.status(401).json({ error: '認証が必要です' })
      await adminAuth.verifyIdToken(idToken)

      const { eventId, photoId } = req.body
      if (!eventId || !photoId) {
        return res.status(400).json({ error: '必須項目が不足しています' })
      }

      const existing = await adminDb
        .collection('favorites')
        .where('eventId', '==', eventId)
        .where('photoId', '==', photoId)
        .get()

      if (!existing.empty) {
        // 既にある → 解除
        await existing.docs[0].ref.delete()
        return res.json({ success: true, action: 'removed' })
      } else {
        // ない → 追加
        await adminDb.collection('favorites').add({
          eventId,
          photoId,
          createdAt: new Date().toISOString(),
        })
        return res.json({ success: true, action: 'added' })
      }
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'お気に入りの更新に失敗しました' })
    }
  }

  return res.status(405).end()
}
