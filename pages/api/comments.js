import { adminDb } from '../../lib/firebase-admin'

export default async function handler(req, res) {
  // ── コメント一覧取得 ──────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { eventId, table } = req.query
      if (!eventId) return res.status(400).json({ error: 'eventIdが必要です' })

      let query = adminDb
        .collection('comments')
        .where('eventId', '==', eventId)
        .orderBy('createdAt', 'desc')

      const snap = await query.get()

      const comments = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => table === 'all' || c.table === table)

      return res.json({ comments })
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'コメントの取得に失敗しました', comments: [] })
    }
  }

  // ── コメント投稿 ──────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { eventId, table, nick, text } = req.body
      if (!eventId || !table || !nick || !text) {
        return res.status(400).json({ error: '必須項目が不足しています' })
      }

      const createdAt = new Date().toISOString()
      const docRef = await adminDb.collection('comments').add({
        eventId,
        table,
        nick,
        text,
        createdAt,
      })

      return res.json({
        success: true,
        comment: { id: docRef.id, eventId, table, nick, text, createdAt }
      })
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'コメントの投稿に失敗しました' })
    }
  }

  return res.status(405).end()
}
