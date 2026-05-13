export const dynamic = 'force-dynamic'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

const TABLE_COLORS = ['#9c27b0','#43a047','#fb8c00','#00acc1','#f44336','#3f51b5','#009688','#e91e8c','#795548','#607d8b']

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(null)
  const [deletingEvent, setDeletingEvent] = useState(null)
  const [newEvent, setNewEvent] = useState({ name: '', date: '', tables: 4 })
  const [customTableNames, setCustomTableNames] = useState(['1卓','2卓','3卓','4卓'])

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
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleTableCount = (n) => {
    setNewEvent(p => ({ ...p, tables: n }))
    setCustomTableNames(prev => {
      const next = [...prev]
      while (next.length < n) next.push(`${next.length + 1}卓`)
      return next.slice(0, n)
    })
  }

  const createEvent = async () => {
    if (!newEvent.name || !newEvent.date) return
    setCreating(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEvent, tableNames: customTableNames })
      })
      const data = await res.json()
      if (data.success) {
        setEvents(prev => [data.event, ...prev])
        setShowCreate(false)
        setNewEvent({ name: '', date: '', tables: 4 })
        setCustomTableNames(['1卓','2卓','3卓','4卓'])
      }
    } catch (e) { alert('作成に失敗しました') }
    setCreating(false)
  }

  const deleteEvent = async (ev) => {
    setDeletingEvent(ev.id)
    try {
      const res = await fetch('/api/delete-event', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: ev.id })
      })
      const data = await res.json()
      if (data.success) {
        setEvents(prev => prev.filter(e => e.id !== ev.id))
        setConfirmDeleteEvent(null)
      } else { alert(data.error || '削除に失敗しました') }
    } catch (e) { alert('削除に失敗しました') }
    setDeletingEvent(null)
  }

  const getTableNames = (ev) => {
    if (ev.tableNames) return ev.tableNames
    return Array.from({ length: ev.tables }, (_, i) => `${i + 1}卓`)
  }

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#aaa' }}>
        <div style={{ fontSize: 40 }}>💍</div>
        <div>読み込み中...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fff0f6 0%,#f3e8ff 100%)', fontFamily: 'sans-serif', paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 20 }}>💍 Wedding Photo</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>👑 {session?.user?.name}</div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/' })}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>
          ログアウト
        </button>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

        {/* 新規作成ボタン */}
        {!showCreate && (
          <button onClick={() => setShowCreate(true)}
            style={{ width: '100%', padding: 16, borderRadius: 16, border: '2px dashed #e0bfff', background: 'white', color: '#9c27b0', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            ＋ 新しい結婚式を作成
          </button>
        )}

        {/* 作成フォーム */}
        {showCreate && (
          <div style={{ background: 'white', borderRadius: 20, padding: 20, marginBottom: 20, boxShadow: '0 4px 20px rgba(233,30,140,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#333' }}>🎊 新しい結婚式を作成</h3>
              <button onClick={() => setShowCreate(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>×</button>
            </div>

            <input
              placeholder="結婚式名（例：田中 & 山本 Wedding）"
              value={newEvent.name}
              onChange={e => setNewEvent(p => ({ ...p, name: e.target.value }))}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #eee', fontSize: 15, boxSizing: 'border-box', marginBottom: 10, outline: 'none' }}
            />

            {/* 日付 ── スマホでもズレないようにtextで入力 */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>
                📅 結婚式の日付（写真投稿はこの日のみ可能）
              </label>
              <input
                type="date"
                value={newEvent.date}
                onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #eee', fontSize: 15, boxSizing: 'border-box', outline: 'none', appearance: 'none', WebkitAppearance: 'none', background: 'white' }}
              />
              {newEvent.date && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#9c27b0', background: '#f3e8ff', borderRadius: 8, padding: '5px 10px' }}>
                  📅 {newEvent.date} のみ写真投稿が可能になります
                </div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 6 }}>卓数: {newEvent.tables}卓</label>
              <input
                type="range" min="1" max="20"
                value={newEvent.tables}
                onChange={e => handleTableCount(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#e91e8c' }}
              />
            </div>

            {/* 卓名カスタマイズ */}
            <div style={{ background: '#faf4ff', borderRadius: 12, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#7b1fa2', marginBottom: 10 }}>🌸 卓名をカスタマイズ（任意）</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {customTableNames.map((name, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: TABLE_COLORS[i % 10], fontWeight: 'bold', whiteSpace: 'nowrap' }}>{i+1}卓</span>
                    <input
                      value={name}
                      onChange={e => {
                        const next = [...customTableNames]
                        next[i] = e.target.value
                        setCustomTableNames(next)
                      }}
                      placeholder={`${i+1}卓`}
                      style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1.5px solid #e0bfff', fontSize: 13, outline: 'none', minWidth: 0 }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>例：「新郎側」「新婦側」「家族席」など</div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowCreate(false)}
                style={{ flex: 1, padding: 13, borderRadius: 12, border: '1.5px solid #eee', background: 'white', fontSize: 14, cursor: 'pointer' }}>
                キャンセル
              </button>
              <button onClick={createEvent} disabled={creating || !newEvent.name || !newEvent.date}
                style={{ flex: 2, padding: 13, borderRadius: 12, border: 'none', background: (newEvent.name && newEvent.date) ? 'linear-gradient(90deg,#e91e8c,#9c27b0)' : '#ddd', color: 'white', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' }}>
                {creating ? '作成中...' : '✨ 作成する'}
              </button>
            </div>
          </div>
        )}

        {/* イベント一覧 */}
        <div style={{ fontSize: 13, fontWeight: 'bold', color: '#888', marginBottom: 12 }}>
          📋 作成済みのイベント（{events.length}件）
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#ccc' }}>読み込み中...</div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#ccc', background: 'white', borderRadius: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 15 }}>まだイベントがありません</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>上のボタンから作成してください</div>
          </div>
        ) : events.map(ev => {
          const tNames = getTableNames(ev)
          return (
            <div key={ev.id} style={{ background: 'white', borderRadius: 20, padding: 18, marginBottom: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 17, color: '#222' }}>💍 {ev.name}</div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 3 }}>{ev.date} · {ev.tables}卓</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ background: '#f3e8ff', color: '#9c27b0', fontSize: 11, padding: '4px 10px', borderRadius: 10, fontWeight: 'bold' }}>開催予定</span>
                  <button onClick={() => setConfirmDeleteEvent(ev)}
                    style={{ background: '#fff0f0', border: 'none', color: '#e53935', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    🗑️
                  </button>
                </div>
              </div>

              {/* 卓名タグ */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {tNames.map((n, i) => (
                  <span key={i} style={{ fontSize: 11, background: TABLE_COLORS[i % 10] + '18', color: TABLE_COLORS[i % 10], padding: '3px 10px', borderRadius: 20, fontWeight: 'bold' }}>
                    🌸 {n}
                  </span>
                ))}
                <span style={{ fontSize: 11, background: '#f4433618', color: '#f44336', padding: '3px 10px', borderRadius: 20, fontWeight: 'bold' }}>🎉 二次会</span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => router.push(`/host/${ev.id}`)}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}>
                  📷 アルバム
                </button>
                <button onClick={() => router.push(`/qr/${ev.id}`)}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1.5px solid #e91e8c', background: 'white', color: '#e91e8c', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}>
                  📱 QRコード
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* イベント削除確認 */}
      {confirmDeleteEvent && (
        <div onClick={() => setConfirmDeleteEvent(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🗑️</div>
            <div style={{ fontWeight: 'bold', fontSize: 17, marginBottom: 6 }}>イベントを削除しますか？</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>「{confirmDeleteEvent.name}」</div>
            <div style={{ fontSize: 12, color: '#e53935', background: '#fff0f0', borderRadius: 10, padding: '8px 12px', marginBottom: 20 }}>
              ⚠️ Googleドライブのフォルダもゴミ箱に移動されます
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDeleteEvent(null)}
                style={{ flex: 1, padding: 13, borderRadius: 12, border: '1.5px solid #eee', background: 'white', fontSize: 14, cursor: 'pointer' }}>
                キャンセル
              </button>
              <button onClick={() => deleteEvent(confirmDeleteEvent)} disabled={deletingEvent === confirmDeleteEvent.id}
                style={{ flex: 1, padding: 13, borderRadius: 12, border: 'none', background: '#e53935', color: 'white', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' }}>
                {deletingEvent === confirmDeleteEvent.id ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
