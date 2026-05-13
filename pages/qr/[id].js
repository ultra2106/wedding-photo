export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wedding-photo-gamma.vercel.app'

function QRCanvas({ value, color = '#1a1a1a', id }) {
  const canvasRef = useRef()
  useEffect(() => {
    if (!canvasRef.current || !value) return
    QRCode.toCanvas(canvasRef.current, value, {
      width: 120, margin: 1,
      color: { dark: color, light: '#ffffff' }
    })
  }, [value, color])
  return <canvas ref={canvasRef} id={id} style={{ borderRadius: 8, display: 'block' }} />
}

export default function QRPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = router.query
  const [event, setEvent] = useState(null)
  const [tables, setTables] = useState([])
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated' && id) fetchEvent()
  }, [status, id])

  const fetchEvent = async () => {
    try {
      // event-name APIから卓名も取得
      const res = await fetch(`/api/event-name?eventId=${id}`)
      const data = await res.json()
      setEvent(data)

      const tableNames = data.tableNames || Array.from({ length: data.tables }, (_, i) => `${i + 1}卓`)
      const colors = ['#9c27b0','#43a047','#fb8c00','#00acc1','#f44336','#3f51b5','#009688','#e91e8c','#795548','#607d8b']

      const tableList = [
        { id: 'public', name: '📢 全体公開', color: '#e91e8c' },
        ...tableNames.map((n, i) => ({
          id: `table${i + 1}`,
          name: `🌸 ${n}`,
          color: colors[i % colors.length],
        })),
        { id: 'afterparty', name: '🎉 二次会', color: '#f44336' },
      ]
      setTables(tableList)
    } catch (e) { console.error(e) }
  }

  const copyUrl = (tableId) => {
    const url = `${BASE_URL}/guest/${id}?table=${tableId}`
    navigator.clipboard?.writeText(url)
    setCopied(tableId)
    setTimeout(() => setCopied(null), 2000)
  }

  const downloadQR = (tableId, tableName) => {
    const canvas = document.querySelector(`#qr-${tableId}`)
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `QR_${tableName}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  if (status === 'loading' || !event) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#aaa' }}>
        <div style={{ fontSize: 40 }}>💍</div>
        <div>読み込み中...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif', paddingBottom: 40 }}>

      <div style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer' }}>←</button>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 17 }}>📱 QRコード一覧</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{event.name} · {event.date}</div>
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 600, margin: '0 auto' }}>
        <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px' }}>
          各卓に印刷して設置してください。ゲストがスキャンすると卓が自動設定されます。
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {tables.map(t => {
            const url = `${BASE_URL}/guest/${id}?table=${t.id}`
            return (
              <div key={t.id} style={{ background: 'white', borderRadius: 16, padding: 16, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: `2px solid ${t.color}22` }}>
                <div style={{ fontWeight: 'bold', fontSize: 14, color: t.color, marginBottom: 10 }}>{t.name}</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <QRCanvas value={url} color={t.color} id={`qr-${t.id}`} />
                </div>
                <div style={{ fontSize: 9, color: '#ccc', wordBreak: 'break-all', marginBottom: 8 }}>{url}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => copyUrl(t.id)}
                    style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${t.color}`, background: copied === t.id ? t.color : 'white', color: copied === t.id ? 'white' : t.color, fontSize: 11, cursor: 'pointer', fontWeight: 'bold' }}>
                    {copied === t.id ? '✅' : '🔗 URL'}
                  </button>
                  <button onClick={() => downloadQR(t.id, t.name)}
                    style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${t.color}`, background: 'white', color: t.color, fontSize: 11, cursor: 'pointer', fontWeight: 'bold' }}>
                    ⬇️ 保存
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ background: '#fff8e1', borderRadius: 12, padding: 12, marginTop: 16, fontSize: 12, color: '#795548' }}>
          💡 「保存」ボタンでQRコード画像をダウンロードできます
        </div>
      </div>
    </div>
  )
}
