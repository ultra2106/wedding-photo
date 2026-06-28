import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import { google } from 'googleapis'
import { Readable } from 'stream'
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

async function getDriveClientFromRefreshToken(encryptedRefreshToken) {
  const refreshToken = decrypt(encryptedRefreshToken)
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: refreshToken })
  await auth.getAccessToken()
  return google.drive({ version: 'v3', auth })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'ログインが必要です' })

  try {
    const { eventId, fileData, mimeType } = req.body
    if (!eventId || !fileData || !mimeType) {
      return res.status(400).json({ error: '必須パラメータが不足しています' })
    }

    const serviceAuth = getServiceClient()
    const sheets = google.sheets({ version: 'v4', auth: serviceAuth })

    const sheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Events!A2:L',
    })

    const rows = sheetRes.data.values || []
    const rowIndex = rows.findIndex(row => row[1] === eventId && row[0] === session.user.email)

    if (rowIndex === -1) {
      return res.status(404).json({ error: 'イベントが見つかりません' })
    }

    const eventRow = rows[rowIndex]
    const rootFolderId = eventRow[5]
    const encryptedRefreshToken = eventRow[6]

    if (!encryptedRefreshToken) {
      return res.status(400).json({ error: 'トークンが見つかりません' })
    }

    const drive = await getDriveClientFromRefreshToken(encryptedRefreshToken)

    // Base64 → バイナリに変換してアップロード（イベントのルートフォルダ直下に保存）
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

    // スプレッドシートのJ列（カバー写真URL）を更新
    const actualRow = rowIndex + 2
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `Events!J${actualRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[coverPhotoUrl]] }
    })

    res.json({ success: true, coverPhotoUrl })

  } catch (error) {
    console.error('Cover upload error:', error)
    res.status(500).json({ error: 'カバー写真のアップロードに失敗しました', detail: error.message })
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
}
