import { adminDb } from '../../lib/firebase-admin'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const { eventId } = req.query
    if (!eventId) return res.status(400).json({ error: 'eventIdが必要です' })

    const snap = await adminDb.collection('events').doc(eventId).get()

    if (!snap.exists) {
      return res.status(404).json({ error: 'イベントが見つかりません' })
    }

    const data = snap.data()

    return res.json({
      name:           data.name,
      date:           data.date,
      tables:         data.tables,
      tableNames:     data.tableNames || Array.from({ length: data.tables }, (_, i) => `${i + 1}卓`),
      startTime:      data.startTime || null,
      coverPhotoUrl:  data.coverPhotoUrl || null,
      welcomeMessage: data.welcomeMessage || '',
      coupleNames:    data.coupleNames || '',
      folderId:       data.folderId || null,
    })

  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'イベント情報の取得に失敗しました' })
  }
}
