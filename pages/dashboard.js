import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newEvent, setNewEvent] = useState({ name: '', date: '', tables: 4 })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated') fetchEvents()
  }, [status])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/events')
      const data = await res.json()
      setEvents(data.events || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const createEvent = async () => {
    if (!newEvent.name || !newEvent.date) return
    setCreating(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      })
      const data = await res.json()
      if (data.success) {
        setEvents(prev => [data.event, ...prev])
        setNewEvent({ name: '', date: '', tables: 4 })
      }
    } catch (e) {
      alert('作成に失敗しました')
    }
    setCreating(false)
  }

  // ローディング中
  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#aaa' }}>
        <div style={{ fontSize: 40 }}>💍</div>
        <div>読み込み中...</div>
      </div>
    </div>
  )

  // 未ログイン
  if (status === 'unauthenticated') return null

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 18 }}>💍 Wedding Photo</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>👑 {session?.user?.name}</div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/' })}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '6px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13 }}>
          ログアウト
        </button>
      </div>

      <div style={{ padding: 16, maxWidth: 600, margin: '0 auto' }}>

        {/* 新規イベント作成 */}
        <div style={{ background: 'white', borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#333' }}>🎊 新しい結婚式を作成</h3>
          <input
            placeholder="結婚式名（例：田中 & 山本 Wedding）"
            value={newEvent.name}
            onChange={e => setNewEvent(p => ({ ...p, name: e.target.value }))}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #eee', fontSize: 15, boxSizing: 'border-box', marginBottom: 10, outline: 'none' }}
          />
          <input
            type="date"
            value={newEvent.date}
            onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #eee', fontSize: 15, boxSizing: 'border-box', marginBottom: 10, outline: 'none' }}
          />
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 6 }}>卓数: {newEvent.tables}卓</label>
            <input
              type="range" min="1" max="20"
              value={newEvent.tables}
              onChange={e => setNewEvent(p => ({ ...p, tables: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: '#e91e8c' }}
            />
          </div>
          <button onClick={createEvent} disabled={creating || !newEvent.name || !newEvent.date}
            style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: (newEvent.name && newEvent.date) ? 'linear-gradient(90deg,#e91e8c,#9c27b0)' : '#ddd', color: 'white', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>
            {creating ? '作成中...' : '✨ 作成してQRコードを生成'}
          </button>
        </div>

        {/* イベント一覧 */}
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#555' }}>📋 作成済みのイベント</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#ccc' }}>読み込み中...</div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#ccc', background: 'white', borderRadius: 16 }}>
            <div style={{ fontSize: 32 }}>📭</div>
            <div style={{ marginTop: 8 }}>まだイベントがありません</div>
          </div>
        ) : (
          events.map(ev => (
            <div key={ev.id} style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 15, color: '#333' }}>{ev.name}</div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{ev.date} · {ev.tables}卓</div>
                </div>
                <span style={{ background: '#f3e8ff', color: '#9c27b0', fontSize: 11, padding: '4px 10px', borderRadius: 10, fontWeight: 'bold' }}>開催予定</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => router.push(`/album/${ev.id}`)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}>
                  📷 アルバムを開く
                </button>
                <button onClick={() => router.push(`/qr/${ev.id}`)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e91e8c', background: 'white', color: '#e91e8c', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}>
                  📱 QRコード
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
