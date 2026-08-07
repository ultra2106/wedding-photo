import { adminDb } from '../../lib/firebase-admin'

export default async function handler(req, res) {
  // ── リアクション一覧取得 ──────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { eventId } = req.query
      if (!eventId) return res.status(400).json({ error: 'eventIdが必要です' })

      const snap = await adminDb
        .collection('reactions')
        .where('eventId', '==', eventId)
        .get()

      // { photoId: { '❤️': ['nick1', 'nick2'], ... } } の形に変換
      const reactMap = {}
      snap.docs.forEach(d => {
        const { photoId, nick, reaction } = d.data()
        if (!reactMap[photoId]) reactMap[photoId] = {}
        if (!reactMap[photoId][reaction]) reactMap[photoId][reaction] = []
        reactMap[photoId][reaction].push(nick)
      })

      return res.json({ reactions: reactMap })
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'リアクションの取得に失敗しました', reactions: {} })
    }
  }

  // ── リアクション投稿・取り消し ────────────────────────────
  if (req.method === 'POST') {
    try {
      const { eventId, photoId, nick, reaction } = req.body
      if (!eventId || !photoId || !nick || !reaction) {
        return res.status(400).json({ error: '必須項目が不足しています' })
      }

      // 同じリアクションが既にあるか確認
      const existing = await adminDb
        .collection('reactions')
        .where('eventId',  '==', eventId)
        .where('photoId',  '==', photoId)
        .where('nick',     '==', nick)
        .where('reaction', '==', reaction)
        .get()

      if (!existing.empty) {
        // 既にある → 取り消し
        await existing.docs[0].ref.delete()
        return res.json({ success: true, action: 'removed' })
      } else {
        // ない → 追加
        await adminDb.collection('reactions').add({
          eventId,
          photoId,
          nick,
          reaction,
          createdAt: new Date().toISOString(),
        })
        return res.json({ success: true, action: 'added' })
      }
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'リアクションの投稿に失敗しました' })
    }
  }

  return res.status(405).end()
}
