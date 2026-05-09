export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'

const VIS_BADGE = {
  public: { label: '🌐 全員', bg: '#e8f5e9', color: '#2e7d32' },
  table:  { label: '👥 卓限定', bg: '#e3f2fd', color: '#1565c0' },
  host:   { label: '🔒 主催者', bg: '#fce4ec', color: '#b71c1c' },
}

export default function HostPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = router.query
  const [event, setEvent] = useState(null)
  const [tables, setTables] = useState([])
  const [activeTab, setActiveTab] = useState('photos')
  const [activeGroup, setActiveGroup] = useState('all')
  const [photos, setPhotos] = useState([])
  const [comments, setComments] = useState([])
  const [lightbox, setLightbox] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [commentTable, setCommentTable] = useState('public')
  const [posting, setPosting] = useState(false)
  const [downloading, setDownloading] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const touchStartX = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated' && id) {
      fetchAll()
      intervalRef.current = setInterval(fetchAll, 30000)
    }
    return () => clearInterval(intervalRef.current)
  }, [status, id])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const evRes = await fetch('/api/events')
      const evData = await evRes.json()
      const ev = evData.events?.find(e => e.id === id)
      if (ev) {
        setEvent(ev)
        const tableList = [
          { id: 'all',        name: '📋 全部',    color: '#555' },
          { id: 'public',     name: '📢 全体公開', color: '#e91e8c' },
          ...Array.from({ length: ev.tables }, (_, i) => ({
            id: `table${i + 1}`,
            name: `🌸 ${i + 1}卓`,
            color: ['#9c27b0','#43a047','#fb8c00','#00acc1','#f44336','#3f51b5','#009688'][i % 7]
          })),
          { id: 'afterparty', name: '🎉 二次会', color: '#f44336' },
        ]
        setTables(tableList)
        setCommentTable('public')
      }
      const phRes = await fetch(`/api/photos?eventId=${id}&role=host`)
      const phData = await phRes.json()
      setPhotos(phData.photos || [])

      const cmRes = await fetch(`/api/comments?eventId=${id}&table=all`)
      const cmData = await cmRes.json()
      setComments(cmData.comments || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const downloadPhoto = async (photo) => {
    setDownloading(photo.id)
    try {
      const response = await fetch(photo.url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${photo.caption || 'photo'}.jpg`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { alert('ダウンロードに失敗しました') }
    setDownloading(null)
  }

  const deletePhoto = async (photo) => {
    setDeleting(photo.id)
    try {
      const res = await fetch('/api/delete-photo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: photo.id, eventId: id,
          nick: session?.user?.name, isHost: true,
        })
      })
      const data = await res.json()
      if (data.success) {
        setPhotos(prev => prev.filter(p => p.id !== photo.id))
        setConfirmDelete(null)
        if (lightbox?.id === photo.id) setLightbox(null)
      } else {
        alert(data.error || '削除できませんでした')
      }
    } catch (e) { alert('削除に失敗しました') }
    setDeleting(null)
  }

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) setLightboxIndex(i => Math.min(i + 1, visiblePhotos.length - 1))
      else setLightboxIndex(i => Math.max(i - 1, 0))
    }
    touchStartX.current = null
  }

  const openLightbox = (photo) => {
    const idx = visiblePhotos.findIndex(p => p.id === photo.id)
    setLightboxIndex(idx)
    setLightbox(photo)
  }

  useEffect(() => {
    if (lightbox) setLightbox(visiblePhotos[lightboxIndex])
  }, [lightboxIndex])

  const postComment = async () => {
    if (!newComment.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: id, table: commentTable,
          nick: `👑 ${session?.user?.name}`, text: newComment.trim(),
        })
      })
      const data = await res.json()
      if (data.success) {
        setComments(prev => [data.comment, ...prev])
        setNewComment('')
      }
    } catch (e) { alert('投稿に失敗しました') }
    setPosting(false)
  }

  const visiblePhotos = photos.filter(p => activeGroup === 'all' || p.group === activeGroup)
  const visibleComments = comments.filter(c => activeGroup === 'all' || c.table === activeGroup)
  const photoCount = (gid) => gid === 'all' ? photos.length : photos.filter(p => p.group === gid).length

  if (status === 'loading' || loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#aaa' }}>
        <div style={{ fontSize: 40 }}>💍</div>
        <div>読み込み中...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', fontFamily: 'sans-serif', paddingBottom: 80 }}>

      <div style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 17 }}>💍 {event?.name || 'Wedding Photo'}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>👑 主催者モード · 全{photos.length}枚</div>
          </div>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 12 }}>
            ← 戻る
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
          {tables.map(t => (
            <button key={t.id} onClick={() => setActiveGroup(t.id)} style={{
              padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 11,
              fontWeight: activeGroup === t.id ? 'bold' : 'normal',
              background: activeGroup === t.id ? 'white' : 'rgba(255,255,255,0.2)',
              color: activeGroup === t.id ? t.color : 'white',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {t.name}
              <span style={{ background: activeGroup === t.id ? t.color : 'rgba(255,255,255,0.3)', color: 'white', borderRadius: 8, padding: '0 5px', fontSize: 10 }}>
                {photoCount(t.id)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #eee' }}>
        {[
          { id: 'photos',   label: '📷 写真',  count: visiblePhotos.length },
          { id: 'comments', label: '💬 掲示板', count: visibleComments.length },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14,
            fontWeight: activeTab === t.id ? 'bold' : 'normal',
            color: activeTab === t.id ? '#e91e8c' : '#888',
            borderBottom: activeTab === t.id ? '2.5px solid #e91e8c' : '2.5px solid transparent'
          }}>
            {t.label}
            <span style={{ marginLeft: 4, background: activeTab === t.id ? '#e91e8c' : '#eee', color: activeTab === t.id ? 'white' : '#999', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {activeTab === 'photos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 10px 0' }}>
          {visiblePhotos.map(p => {
            const b = VIS_BADGE[p.visibility] || VIS_BADGE.public
            return (
              <div key={p.id} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <div style={{ position: 'relative' }} onClick={() => openLightbox(p)}>
                  <img src={p.url} alt={p.caption} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block', cursor: 'pointer' }} />
                  <span style={{ position: 'absolute', top: 5, right: 5, fontSize: 10, background: b.bg, color: b.color, padding: '2px 6px', borderRadius: 8, fontWeight: 'bold' }}>{b.label}</span>
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(p) }}
                    style={{ position: 'absolute', top: 5, left: 5, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: 'white', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ×
                  </button>
                </div>
                <div style={{ padding: '8px 10px 10px' }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold', color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{p.caption}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>{p.nick} · {p.ts}</div>
                  <button onClick={() => downloadPhoto(p)} disabled={downloading === p.id}
                    style={{ width: '100%', padding: '5px', borderRadius: 8, border: '1px solid #e91e8c', background: 'white', color: '#e91e8c', fontSize: 11, cursor: 'pointer', fontWeight: 'bold' }}>
                    {downloading === p.id ? '⏳ 保存中...' : '⬇️ 保存'}
                  </button>
                </div>
              </div>
            )
          })}
          {visiblePhotos.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: '#ccc' }}>
              <div style={{ fontSize: 40 }}>📷</div>
              <div style={{ marginTop: 8 }}>まだ写真がありません</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>30秒ごとに自動更新されます</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'comments' && (
        <div style={{ padding: '12px 14px' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 14, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 8 }}>👑 主催者として投稿</div>
            <select value={commentTable} onChange={e => setCommentTable(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #eee', fontSize: 14, boxSizing: 'border-box', marginBottom: 8, background: 'white' }}>
              {tables.filter(t => t.id !== 'all').map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <textarea placeholder="例：二次会は18時から渋谷の〇〇です！"
              value={newComment} onChange={e => setNewComment(e.target.value)} rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #eee', fontSize: 14, boxSizing: 'border-box', marginBottom: 8, resize: 'none', outline: 'none' }} />
            <button onClick={postComment} disabled={posting || !newComment.trim()}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: newComment.trim() ? 'linear-gradient(90deg,#e91e8c,#9c27b0)' : '#ddd', color: 'white', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' }}>
              {posting ? '投稿中...' : '📨 投稿する'}
            </button>
          </div>
          {visibleComments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#ccc' }}>
              <div style={{ fontSize: 32 }}>💬</div>
              <div style={{ marginTop: 8 }}>まだメッセージがありません</div>
            </div>
          ) : visibleComments.map(c => {
            const t = tables.find(x => x.id === c.table)
            return (
              <div key={c.id} style={{ background: 'white', borderRadius: 14, padding: '12px 14px', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 'bold', fontSize: 13, color: '#333' }}>{c.nick}</span>
                  <span style={{ fontSize: 11, background: (t?.color || '#999') + '22', color: t?.color || '#999', padding: '2px 8px', borderRadius: 8 }}>{t?.name}</span>
                </div>
                <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{c.text}</div>
                <div style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>{c.createdAt}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)' }}>
            {lightboxIndex > 0 && (
              <button onClick={() => setLightboxIndex(i => i - 1)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 40, height: 40, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>‹</button>
            )}
          </div>
          <div style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)' }}>
            {lightboxIndex < visiblePhotos.length - 1 && (
              <button onClick={() => setLightboxIndex(i => i + 1)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 40, height: 40, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>›</button>
            )}
          </div>
          <img src={lightbox.url} style={{ maxWidth: '100%', maxHeight: '65dvh', borderRadius: 12, objectFit: 'contain' }} />
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 }}>{lightboxIndex + 1} / {visiblePhotos.length}</div>
          <div style={{ color: 'white', marginTop: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 'bold' }}>{lightbox.caption}</div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{lightbox.nick} · {lightbox.ts}</div>
            <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => downloadPhoto(lightbox)} disabled={downloading === lightbox?.id}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 18px', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>
                {downloading === lightbox?.id ? '⏳' : '⬇️ 保存'}
              </button>
              <button onClick={() => { setLightbox(null); setConfirmDelete(lightbox) }}
                style={{ background: 'rgba(220,50,50,0.5)', border: 'none', color: 'white', padding: '8px 18px', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>
                🗑️ 削除
              </button>
              <button onClick={() => setLightbox(null)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 18px', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>
                ✕ 閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 300, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗑️</div>
            <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>この写真を削除しますか？</div>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>削除するとドライブのゴミ箱に移動します</div>
            <img src={confirmDelete.url} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1.5px solid #eee', background: 'white', fontSize: 14, cursor: 'pointer' }}>
                キャンセル
              </button>
              <button onClick={() => deletePhoto(confirmDelete)} disabled={deleting === confirmDelete?.id}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#e53935', color: 'white', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' }}>
                {deleting === confirmDelete?.id ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
