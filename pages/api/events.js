import { adminAuth, adminDb } from '../../lib/firebase-admin'
import { google } from 'googleapis'
import crypto from 'crypto'

function encrypt(text) {
  const secret = process.env.NEXTAUTH_SECRET.padEnd(32, '0').slice(0, 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secret), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

// Firebase IDトークンを検証してユーザー情報を返す
async function verifyToken(req) {
  const idToken = req.body?.idToken || req.query?.idToken
  if (!idToken) throw new Error('IDトークンがありません')
  const decoded = await adminAuth.verifyIdToken(idToken)
  return decoded
}

export default async function handler(req, res) {

  // ── イベント一覧取得 ──────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const idToken = req.query.idToken
      if (!idToken) return res.status(401).json({ error: '認証が必要です' })
      const decoded = await adminAuth.verifyIdToken(idToken)

      const snap = await adminDb
        .collection('events')
        .where('ownerEmail', '==', decoded.email)
        .orderBy('createdAt', 'desc')
        .get()

      const events = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      return res.json({ events })
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'イベントの取得に失敗しました', events: [] })
    }
  }

  // ── イベント作成 ──────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const decoded = await verifyToken(req)
      const { name, date, tables, tableNames, startTime, accessToken } = req.body

      const customNames = tableNames || Array.from({ length: tables }, (_, i) => `${i + 1}卓`)

      // Google Drive にフォルダを作成（accessTokenを使用）
      let rootFolderId = null
      let encryptedToken = null

      if (accessToken) {
        const auth = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        )
        auth.setCredentials({ access_token: accessToken })
        const drive = google.drive({ version: 'v3', auth })

        const rootFolder = await drive.files.create({
          requestBody: {
            name: `💍 ${name}`,
            mimeType: 'application/vnd.google-apps.folder',
          },
          fields: 'id'
        })
        rootFolderId = rootFolder.data.id

        const folderNames = [
          '📢 全体公開',
          ...customNames.map(n => `🌸 ${n}`),
          '🎉 二次会',
          '🔒 主催者のみ',
        ]
        await Promise.all(folderNames.map(fName =>
          drive.files.create({
            requestBody: {
              name: fName,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [rootFolderId],
            }
          })
        ))
      }

      // Firestoreにイベントを保存
      const eventData = {
        ownerEmail:     decoded.email,
        name,
        date,
        tables,
        tableNames:     customNames,
        startTime:      startTime || '',
        folderId:       rootFolderId || '',
        coverPhotoUrl:  '',
        welcomeMessage: '',
        coupleNames:    '',
        createdAt:      new Date().toISOString(),
      }

      const docRef = await adminDb.collection('events').add(eventData)

      return res.json({
        success: true,
        event: { id: docRef.id, ...eventData }
      })

    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'イベントの作成に失敗しました', detail: e.message })
    }
  }

  // ── イベント更新（卓名・時間・カバー写真等） ───────────────
  if (req.method === 'PATCH') {
    try {
      const decoded = await verifyToken(req)
      const { eventId, tableNames, startTime, coverPhotoUrl, welcomeMessage, coupleNames } = req.body

      const ref = adminDb.collection('events').doc(eventId)
      const snap = await ref.get()

      if (!snap.exists) return res.status(404).json({ error: 'イベントが見つかりません' })
      if (snap.data().ownerEmail !== decoded.email) return res.status(403).json({ error: '権限がありません' })

      const updates = {}
      if (tableNames     !== undefined) updates.tableNames     = tableNames
      if (startTime      !== undefined) updates.startTime      = startTime
      if (coverPhotoUrl  !== undefined) updates.coverPhotoUrl  = coverPhotoUrl
      if (welcomeMessage !== undefined) updates.welcomeMessage = welcomeMessage
      if (coupleNames    !== undefined) updates.coupleNames    = coupleNames

      await ref.update(updates)
      return res.json({ success: true })

    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: '更新に失敗しました', detail: e.message })
    }
  }

  return res.status(405).end()
}
