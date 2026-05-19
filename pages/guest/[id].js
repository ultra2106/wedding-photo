export const dynamic = 'force-dynamic'

import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'

const VIS_BADGE = {
  public: { label: '🌐 全員', bg: '#e8f5e9', color: '#2e7d32' },
  table:  { label: '👥 卓限定', bg: '#e3f2fd', color: '#1565c0' },
  host:   { label: '🔒 主催者', bg: '#fce4ec', color: '#b71c1c' },
}
const REACTIONS = ['❤️', '👏', '😆']

export default function GuestPage() {
  const router = useRouter()
  const { id, table } = router.query
  const [nick, setNick] = useState('')
  const [savedNick, setSavedNick] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [userTable, setUserTable] = useState(table || 'table1')
  const [eventInfo, setEventInfo] = useState(null)
  const [photos, setPhotos] = useState([])
  const [comments, setComments] = useState([])
  const [reactions, setReactions] = useState({})
  const [favorites, setFavorites] = useState([])
  const [activeTab, setActiveTab] = useState('photos')
  const [photoFilter, setPhotoFilter] = useState('all')
  const [lightbox, setLightbox] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [newCap, setNewCap] = useState('')
  const [newVis, setNewVis] = useState('public')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [downloading, setDownloading] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [reactingId, setReactingId] = useState(null)
  const fileRef = useRef()
  const touchStartX = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => { if (table) setUserTable(table) }, [table])

  useEffect(() => {
    const stored = localStorage.getItem('wedding_photo_nick')
    if (stored) {
      setNick(stored)
      setSavedNick(stored)
    }
  }, [])

  useEffect(() => {
    if (loggedIn && id) {
      fetchAll()
      intervalRef.current = setInterval(fetchAll, 30000)
    }
    return () => clearInterval(intervalRef.current)
  }, [loggedIn, id])

  const fetchAll = async () => {
    try {
      const [phRes, cmRes, rcRes, fvRes, evRes] = await Promise.all([
        fetch(`/api/photos?eventId=${id}&table=${userTable}`),
        fetch(`/api/comments?eventId=${id}&table=${userTable}`),
        fetch(`/api/reactions?eventId=${id}`),
        fetch(`/api/favorites?eventId=${id}`),
        fetch(`/api/event-name?eventId=${id}`),
      ])
      const [phData, cmData, rcData, fvData, evData] = await Promise.all([
        phRes.json(), cmRes.json(), rcRes.json(), fvRes.json(), evRes.json()
      ])
      setPhotos(phData.photos || [])
      setComments(cmData.comments || [])
      setReactions(rcData.reactions || {})
      setFavorites(fvData.favorites || [])
      setEventInfo(evData)
    } catch (e) { console.error(e) }
  }

  const handleLogin = () => {
    if (!nick.trim()) return
    localStorage.setItem('wedding_photo_nick', nick.trim())
    setLoggedIn(true)
  }

  const canUpload = () => {
    if (!eventInfo?.date) return true
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    if (today !== eventInfo.date) return false
    if (eventInfo.startTime) {
      const [startHour, startMin] = eventInfo.startTime.split(':').map(Number)
      const startMinutes = startHour * 60 + startMin
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      return nowMinutes >= startMinutes
    }
    return true
  }

  const uploadBlockReason = () => {
    if (!eventInfo?.date) return null
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    if (today !== eventInfo.date) return `📅 写真の投稿は結婚式当日（${eventInfo.date}）のみ可能です`
    if (eventInfo.startTime && !canUpload()) return `🕐 写真の投稿は ${eventInfo.startTime} から開始されます`
    return null
  }

  const tableLabel = () => {
    if (!eventInfo) return ''
    if (userTable === 'public') return '📢 全体公開'
    if (userTable === 'afterparty') return '🎉 二次会'
    const idx = parseInt(userTable.replace('table', '')) - 1
    const name = eventInfo.tableNames?.[idx] || `${idx + 1}卓`
    return `🌸 ${name}`
  }

  const sendReaction = async (photoId, reaction) => {
    setReactingId(photoId + reaction)
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, photoId, nick, reaction })
      })
      const data = await res.json()
      if (data.success) {
        setReactions(prev => {
          const next = { ...prev }
          if (!next[photoId]) next[photoId] = {}
          if (!next[photoId][reaction]) next[photoId][reaction] = []
          if (data.action === 'added') {
            next[photoId][reaction] = [...next[photoId][reaction], nick]
          } else {
            next[photoId][reaction] = next[photoId][reaction].filter(n => n !== nick)
          }
          return next
        })
      }
    } catch (e) { console.error(e) }
    setReactingId(null)
  }

  const downloadPhoto = async (photo) => {
    setDownloading(photo.id)
    try {
      const res = await fetch(photo.url)
      const blob = await res.blob()
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
        body: JSON.stringify({ fileId: photo.id, eventId: id, nick, isHost: false })
      })
      const data = await res.json()
      if (data.success) {
        setPhotos(prev => prev.filter(p => p.id !== photo.id))
        setConfirmDelete(null)
        if (lightbox?.id === photo.id) setLightbox(null)
      } else { alert(data.error || '削除できませんでした') }
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

  const handleFiles = (e) => {
    const files = Array.from(e.target.files).map(f => ({
      file: f, preview: URL.createObjectURL(f), name: f.name,
    }))
    setSelectedFiles(files)
    e.target.value = ''
  }

  const submitUpload = async () => {
    if (!selectedFiles.length) return
    setUploading(true)
    try {
      for (const f of selectedFiles) {
        const base64 = await new Promise(res => {
          const reader = new FileReader()
          reader.onload = () => res(reader.result.split(',')[1])
          reader.readAsDataURL(f.file)
        })
        await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: id, fileName: f.name, fileData: base64,
            mimeType: f.file.type, group: userTable,
            caption: newCap, visibility: newVis, nick,
          })
        })
      }
      setUploadOpen(false)
      setSelectedFiles([])
      setNewCap('')
      fetchAll()
    } catch (e) { alert('アップロードに失敗しました') }
    setUploading(false)
  }

  const postComment = async () => {
    if (!newComment.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, table: userTable, nick, text: newComment.trim() })
      })
      const data = await res.json()
      if (data.success) {
        setComments(prev => [data.comment, ...prev])
        setNewComment('')
      }
    } catch (e) { alert('投稿に失敗しました') }
    setPosting(false)
  }

  const getReactionSummary = (photoId) => {
    const r = reactions[photoId] || {}
    const total = Object.values(r).reduce((sum, arr) => sum + arr.length, 0)
    return { total, detail: r }
  }

  const visiblePhotos = photos.filter(p => photoFilter === 'best' ? favorites.includes(p.id) : true)
  const bestCount = photos.filter(p => favorites.includes(p.id)).length
  const blockReason = uploadBlockReason()

  // ── ログイン画面 ──
  if (!loggedIn) return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(160deg,#fff0f6,#f3e8ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, boxShadow: '0 8px 40px rgba(233,30,140,0.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48 }}>💍</div>
          <h2 style={{ margin: '8px 0 4px', color: '#c2185b', fontSize: 22 }}>Wedding Photo</h2>
          <p style={{ color: '#aaa', fontSize: 13, margin: 0 }}>{tableLabel() || 'アルバム'}</p>
        </div>

        <input
          placeholder="ニックネームを入力"
          value={nick}
          onChange={e => setNick(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && nick.trim() && handleLogin()}
          style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1.5px solid #eee', fontSize: 16, boxSizing: 'border-box', marginBottom: 8, outline: 'none' }}
        />

        {savedNick && nick === savedNick && (
          <div style={{ fontSize: 12, color: '#9c27b0', background: '#f3e8ff', borderRadius: 8, padding: '6px 10px', marginBottom: 10, textAlign: 'center' }}>
            ✨ 前回のニックネームを自動入力しました
          </div>
        )}

        {savedNick && nick !== savedNick && (
          <button onClick={() => setNick(savedNick)}
            style={{ width: '100%', padding: '8px', borderRadius: 10, border: '1.5px solid #e0bfff', background: '#faf4ff', color: '#9c27b0', fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>
            前回の「{savedNick}」を使う
          </button>
        )}

        <button onClick={handleLogin} disabled={!nick.trim()}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: nick.trim() ? 'linear-gradient(90deg,#e91e8c,#9c27b0)' : '#ddd', color: 'white', fontWeight: 'bold', fontSize: 16, cursor: nick.trim() ? 'pointer' : 'default', marginBottom: 12 }}>
          入場する 🎊
        </button>

        {/* 使い方を見るボタン */}
        <button
          onClick={() => router.push(`/how-to-use?role=guest`)}
          style={{ width: '100%', padding: '11px 16px', borderRadius: 12, border: '1.5px solid #fce4ec', background: 'white', color: '#e91e8c', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          📖 使い方を見る
        </button>

        <p style={{ color: '#bbb', fontSize: 12, textAlign: 'center', margin: 0 }}>Googleアカウント不要です</p>
      </div>
    </div>
  )

  // ── メイン画面 ──
  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', fontFamily: 'sans-serif', paddingBottom: 80 }}>

      <div style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 17 }}>💍 {eventInfo?.name || 'Wedding Photo'}</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>{nick} · {tableLabel()}</div>
        </div>
        {canUpload()
          ? <button onClick={() => setUploadOpen(true)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 'bold', cursor: 'pointer' }}>
              ＋ 追加
            </button>
          : <div style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 10px', borderRadius: 10, fontSize: 10, opacity: 0.9, textAlign: 'right', maxWidth: 120 }}>
              {eventInfo?.startTime ? `🕐 ${eventInfo.startTime}〜` : `📅 ${eventInfo?.date}`}
            </div>
        }
      </div>

      {blockReason && (
        <div style={{ background: '#fff8e1', padding: '10px 16px', fontSize: 13, color: '#795548', textAlign: 'center', borderBottom: '1px solid #ffe082' }}>
          {blockReason}
        </div>
      )}

      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #eee' }}>
        {[
          { id: 'photos',   label: '📷 写真',  count: photos.length },
          { id: 'comments', label: '💬 掲示板', count: comments.length },
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
        <>
          <div style={{ padding: '10px 12px 0', display: 'flex', gap: 8 }}>
            <button onClick={() => setPhotoFilter('all')} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: photoFilter === 'all' ? 'bold' : 'normal', background: photoFilter === 'all' ? '#555' : '#f0f0f0', color: photoFilter === 'all' ? 'white' : '#666' }}>
              📷 すべて ({photos.length})
            </button>
            <button onClick={() => setPhotoFilter('best')} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: photoFilter === 'best' ? 'bold' : 'normal', background: photoFilter === 'best' ? '#f9a825' : '#f0f0f0', color: photoFilter === 'best' ? 'white' : '#666' }}>
              ⭐ ベスト ({bestCount})
            </button>
          </div>

          {photoFilter === 'best' && bestCount > 0 && (
            <div style={{ margin: '8px 12px 0', background: 'linear-gradient(90deg,#f9a825,#fb8c00)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⭐</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 13, color: 'white' }}>主催者が選んだベスト写真</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{bestCount}枚が選ばれています</div>
              </div>
            </div>
          )}

          {photoFilter === 'best' && bestCount === 0 && (
            <div style={{ margin: '8px 12px 0', background: '#fff8e1', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#795548', textAlign: 'center' }}>
              ⭐ まだベスト写真が選ばれていません。素敵な写真を投稿しよう！
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 10px 0' }}>
            {visiblePhotos.map(p => {
              const b = VIS_BADGE[p.visibility] || VIS_BADGE.public
              const isMine = p.nick === nick
              const isBest = favorites.includes(p.id)
              const { total, detail } = getReactionSummary(p.id)
              return (
                <div key={p.id} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: isBest ? '0 2px 12px rgba(249,168,37,0.3)' : '0 2px 8px rgba(0,0,0,0.07)', border: isBest ? '2px solid #f9a825' : 'none' }}>
                  <div style={{ position: 'relative' }} onClick={() => openLightbox(p)}>
                    <img src={p.url} alt={p.caption} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block', cursor: 'pointer' }} />
                    {isBest && <div style={{ position: 'absolute', top: 5, left: 5, background: '#f9a825', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⭐</div>}
                    <span style={{ position: 'absolute', top: 5, right: 5, fontSize: 10, background: b.bg, color: b.color, padding: '2px 6px', borderRadius: 8, fontWeight: 'bold' }}>{b.label}</span>
                    {isMine && (
                      <button onClick={e => { e.stopPropagation(); setConfirmDelete(p) }}
                        style={{ position: 'absolute', bottom: 5, right: 5, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: 'white', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ×
                      </button>
                    )}
                  </div>
                  <div style={{ padding: '8px 10px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 'bold', color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{p.caption}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>{p.nick} · {p.ts}</div>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      {REACTIONS.map(r => {
                        const count = (detail[r] || []).length
                        const reacted = (detail[r] || []).includes(nick)
                        return (
                          <button key={r} onClick={() => sendReaction(p.id, r)} disabled={reactingId === p.id + r}
                            style={{ flex: 1, padding: '4px 2px', borderRadius: 20, border: `1.5px solid ${reacted ? '#e91e8c' : '#eee'}`, background: reacted ? '#fff0f6' : 'white', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                            {r}
                            {count > 0 && <span style={{ color: reacted ? '#e91e8c' : '#aaa', fontSize: 10, fontWeight: 'bold' }}>{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                    {total > 0 && (
                      <div style={{ fontSize: 11, color: '#e91e8c', fontWeight: 'bold', marginBottom: 4, textAlign: 'center' }}>
                        合計 {total} リアクション
                      </div>
                    )}
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
                <div style={{ marginTop: 8 }}>{photoFilter === 'best' ? 'ベスト写真はまだありません' : 'まだ写真がありません'}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>30秒ごとに自動更新されます</div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'comments' && (
        <div style={{ padding: '12px 14px' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 14, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <textarea placeholder="メッセージを入力（例：おめでとうございます！）"
              value={newComment} onChange={e => setNewComment(e.target.value)} rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #eee', fontSize: 14, boxSizing: 'border-box', marginBottom: 8, resize: 'none', outline: 'none' }} />
            <button onClick={postComment} disabled={posting || !newComment.trim()}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: newComment.trim() ? 'linear-gradient(90deg,#e91e8c,#9c27b0)' : '#ddd', color: 'white', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' }}>
              {posting ? '投稿中...' : '📨 投稿する'}
            </button>
          </div>
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#ccc' }}>
              <div style={{ fontSize: 32 }}>💬</div>
              <div style={{ marginTop: 8 }}>まだメッセージがありません</div>
            </div>
          ) : comments.map(c => (
            <div key={c.id} style={{ background: 'white', borderRadius: 14, padding: '12px 14px', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 'bold', fontSize: 13, color: '#333', marginBottom: 4 }}>{c.nick}</div>
              <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{c.text}</div>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>{c.createdAt}</div>
            </div>
          ))}
        </div>
      )}

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
          <img src={lightbox.url} style={{ maxWidth: '100%', maxHeight: '60dvh', borderRadius: 12, objectFit: 'contain' }} />
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6 }}>{lightboxIndex + 1} / {visiblePhotos.length}</div>
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 6 }}>
              {REACTIONS.map(r => {
                const count = (reactions[lightbox?.id]?.[r] || []).length
                const reacted = (reactions[lightbox?.id]?.[r] || []).includes(nick)
                return (
                  <button key={r} onClick={() => sendReaction(lightbox.id, r)}
                    style={{ padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${reacted ? '#e91e8c' : 'rgba(255,255,255,0.3)'}`, background: reacted ? 'rgba(233,30,140,0.3)' : 'rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 16, color: 'white', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {r} {count > 0 && <span style={{ fontSize: 13, fontWeight: 'bold' }}>{count}</span>}
                  </button>
                )
              })}
            </div>
            {(() => {
              const total = REACTIONS.reduce((sum, r) => sum + (reactions[lightbox?.id]?.[r]?.length || 0), 0)
              return total > 0 ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>合計 {total} リアクション</div> : null
            })()}
          </div>
          <div style={{ color: 'white', marginTop: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 'bold' }}>{lightbox.caption}</div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{lightbox.nick} · {lightbox.ts}</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => downloadPhoto(lightbox)} disabled={downloading === lightbox?.id}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>
                {downloading === lightbox?.id ? '⏳' : '⬇️ 保存'}
              </button>
              {lightbox?.nick === nick && (
                <button onClick={() => { setLightbox(null); setConfirmDelete(lightbox) }}
                  style={{ background: 'rgba(220,50,50,0.4)', border: 'none', color: 'white', padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>
                  🗑️ 削除
                </button>
              )}
              <button onClick={() => setLightbox(null)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>
                ✕ 閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 300, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗑️</div>
            <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>この写真を削除しますか？</div>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>削除するとドライブからも消えます</div>
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

      {uploadOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && setUploadOpen(false)}>
          <div style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: '20px 18px 36px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: 36, height: 4, background: '#ddd', borderRadius: 2, margin: '0 auto 18px' }} />
            <h3 style={{ margin: '0 0 14px', fontSize: 17 }}>📸 写真を追加</h3>
            <div onClick={() => fileRef.current?.click()} style={{ background: '#f8f8f8', borderRadius: 14, padding: 18, textAlign: 'center', marginBottom: 12, border: '2px dashed #e0e0e0', cursor: 'pointer' }}>
              {selectedFiles.length > 0
                ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {selectedFiles.map((f, i) => <img key={i} src={f.preview} style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />)}
                    <div style={{ fontSize: 12, color: '#888', width: '100%', marginTop: 6 }}>{selectedFiles.length}枚選択済み</div>
                  </div>
                : <><div style={{ fontSize: 28, marginBottom: 4 }}>📁</div><div style={{ fontSize: 13, color: '#bbb' }}>タップして写真を選択</div></>
              }
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
            </div>
            <input placeholder="キャプション" value={newCap} onChange={e => setNewCap(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #eee', fontSize: 15, boxSizing: 'border-box', marginBottom: 8, outline: 'none' }} />
            <select value={newVis} onChange={e => setNewVis(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #eee', fontSize: 15, boxSizing: 'border-box', marginBottom: 14, background: 'white' }}>
              <option value="public">🌐 全員に公開</option>
              <option value="table">👥 この卓と主催者のみ</option>
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setUploadOpen(false); setSelectedFiles([]) }} style={{ flex: 1, padding: 14, borderRadius: 12, border: '1.5px solid #eee', background: 'white', fontSize: 15, cursor: 'pointer' }}>キャンセル</button>
              <button onClick={submitUpload} disabled={uploading || !selectedFiles.length}
                style={{ flex: 2, padding: 14, borderRadius: 12, border: 'none', background: selectedFiles.length ? 'linear-gradient(90deg,#e91e8c,#9c27b0)' : '#ddd', color: 'white', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>
                {uploading ? 'アップロード中...' : '☁️ ドライブに保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
