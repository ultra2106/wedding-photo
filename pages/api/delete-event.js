import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { google } from 'googleapis'
import crypto from 'crypto'

function decrypt(text) {
  const secret = process.env.NEXTAUTH_SECRET.padEnd(32, '0').slice(0, 32)
  const [ivHex, encryptedHex] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secret), iv)
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}

function getServiceClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return auth
}

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'ログインが必要です' })

  try {
    const { eventId } = req.body
    const serviceAuth = getServiceClient()
    const sheets = google.sheets({ version: 'v4', auth: serviceAuth })

    // スプレッドシートからイベント一覧を取得
    const sheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Events!A2:G',
    })

    const rows = sheetRes.data.values || []
    const rowIndex = rows.findIndex(row => row[1] === eventId && row[0] === session.user.email)

    if (rowIndex === -1) {
      return res.status(404).json({ error: 'イベントが見つかりません' })
    }

    // Googleドライブのフォルダも削除（ゴミ箱へ）
    const eventRow = rows[rowIndex]
    const folderId = eventRow[5]
    const encryptedToken = eventRow[6]

    if (folderId && encryptedToken) {
      try {
        const refreshToken = decrypt(encryptedToken)
        const auth = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        )
        auth.setCredentials({ refresh_token: refreshToken })
        const drive = google.drive({ version: 'v3', auth })
        await drive.files.update({
          fileId: folderId,
          requestBody: { trashed: true },
        })
      } catch (e) {
        console.error('Drive folder delete error:', e)
        // ドライブ削除失敗しても続行
      }
    }

    // スプレッドシートの行を削除
    // 対象行を空にする（完全削除はbatchUpdateが必要なので空行にする）
    const actualRow = rowIndex + 2 // ヘッダー行 + 0始まり
    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `Events!A${actualRow}:G${actualRow}`,
    })

    res.json({ success: true })

  } catch (error) {
    console.error('Delete event error:', error)
    res.status(500).json({ error: 'イベントの削除に失敗しました', detail: error.message })
  }
}
