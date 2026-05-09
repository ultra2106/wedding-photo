import { google } from ‘googleapis’
import crypto from ‘crypto’

function decrypt(text) {
const secret = process.env.NEXTAUTH_SECRET.padEnd(32, ‘0’).slice(0, 32)
const [ivHex, encryptedHex] = text.split(’:’)
const iv = Buffer.from(ivHex, ‘hex’)
const encrypted = Buffer.from(encryptedHex, ‘hex’)
const decipher = crypto.createDecipheriv(‘aes-256-cbc’, Buffer.from(secret), iv)
let decrypted = decipher.update(encrypted)
decrypted = Buffer.concat([decrypted, decipher.final()])
return decrypted.toString()
}

function getServiceClient() {
const auth = new google.auth.GoogleAuth({
credentials: {
client_email: process.env.GOOGLE_SERVICE_EMAIL,
private_key: process.env.GOOGLE_SERVICE_KEY?.replace(/\n/g, ‘\n’),
},
scopes: [‘https://www.googleapis.com/auth/spreadsheets.readonly’],
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
return google.drive({ version: ‘v3’, auth })
}

export default async function handler(req, res) {
if (req.method !== ‘DELETE’) return res.status(405).end()

try {
const { fileId, eventId, nick, isHost } = req.body

```
if (!fileId || !eventId) {
  return res.status(400).json({ error: '必須パラメータが不足しています' })
}

const serviceAuth = getServiceClient()
const sheets = google.sheets({ version: 'v4', auth: serviceAuth })

const sheetRes = await sheets.spreadsheets.values.get({
  spreadsheetId: process.env.SPREADSHEET_ID,
  range: 'Events!A2:G',
})

const rows = sheetRes.data.values || []
const eventRow = rows.find(row => row[1] === eventId)

if (!eventRow) {
  return res.status(404).json({ error: 'イベントが見つかりません' })
}

const encryptedRefreshToken = eventRow[6]
const drive = await getDriveClientFromRefreshToken(encryptedRefreshToken)

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

res.json({ success: true })
```

} catch (error) {
console.error(‘Delete error:’, error)
res.status(500).json({ error: ‘削除に失敗しました’, detail: error.message })
}
}
