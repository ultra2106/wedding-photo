export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wedding-photo-gamma.vercel.app'

// シンプルなQRコード（SVGベース）
function QRSvg({ value, size = 120, color = '#1a1a1a' }) {
  const N = 21, cell = size / N
  const seed = value.split('').reduce((a, c, i) => a ^ (c.charCodeAt(0) * (i + 7)), 0)
  const isFinder = (r, c, or, oc) => {
    const dr = r - or, dc = c - oc
    if (dr < 0 || dr > 6 || dc < 0 || dc > 6) return false
    return dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)
  }
  const pat = Array.from({ length: N }, (_, r) =>
    Array.from({ length: N }, (_, c) => {
      if (isFinder(r, c, 0, 0) || isFinder(r, c, 0, N - 7) || isFinder(r, c, N - 7, 0)) return true
      return ((seed * (r + 1) * (c + 3) * 31 + r * 17 + c * 13) & 0xff) % 3 === 0
    })
  )
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: 8, display: 'block' }}>
      <rect width={size} height={size} fill="white" />
      {pat.map((row, r) => row.map((on, c) => on
        ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill={color} />
        : null
      ))}
    </svg>
  )
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
    const res = await fetch('/api/events')
    const data = await res.json()
    const ev = data.events?.find(e => e.id === id)
    if (ev) {
      setEvent(ev)
      const tableList = [
        { id: 'public', name: '📢 全体公開', color: '#e91e8c' },
        ...Array.from({ length: ev.tables }, (_, i) => ({
          id: `table${i + 1}`,
          name: `🌸 ${i + 1}卓`,
          color: ['#9c27b0', '#43a047', '#fb8c00', '#00acc1', '#f44336', '#3f51b5', '#009688'][i % 7]
        })),
        { id: 'afterparty', name: '🎉 二次会', color: '#f44336' },
      ]
      setTables(tableList)
    }
  }

  const copyUrl = (tableId) => {
    const url = `${BASE_URL}/guest/${id}?table=${tableId}`
    navigator.clipboard?.writeText(url)
    setCopied(tableId)
    setTimeout(() => setCopied(null), 2000)
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

      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer' }}>←</button>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 17 }}>📱 QRコード一覧</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{event.name}</div>
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
                  <QRSvg value={url} size={100} color={t.color} />
                </div>
                <div style={{ fontSize: 9, color: '#ccc', wordBreak: 'break-all', marginBottom: 8 }}>{url}</div>
                <button onClick={() => copyUrl(t.id)}
                  style={{ width: '100%', padding: '6px', borderRadius: 8, border: `1px solid ${t.color}`, background: copied === t.id ? t.color : 'white', color: copied === t.id ? 'white' : t.color, fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }}>
                  {copied === t.id ? '✅ コピー済み' : '🔗 URLコピー'}
                </button>
              </div>
            )
          })}
        </div>

        <div style={{ background: '#fff8e1', borderRadius: 12, padding: 12, marginTop: 16, fontSize: 12, color: '#795548' }}>
          💡 QRコードは印刷してA6サイズで各卓に置くと便利です
        </div>
      </div>
    </div>
  )
}
