export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'

const VIS_BADGE = {
  public: { label: '🌐 全員', bg: '#e8f5e9', color: '#2e7d32' },
  table:  { label: '👥 卓限定', bg: '#e3f2fd', color: '#1565c0' },
  host:   { label: '🔒 主催者', bg: '#fce4ec', color: '#b71c1c' },
}
const REACTIONS = ['❤️', '👏', '😆']
const TABLE_COLORS = ['#9c27b0','#43a047','#fb8c00','#00acc1','#f44336','#3f51b5','#009688']

export default function HostPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = router.query
  const [event, setEvent] = useState(null)
  const [tables, setTables] = useState([])
  const [activeTab, setActiveTab] = useState('photos')
  const [activeGroup, setActiveGroup] = useState('all')
  const [photoFilter, setPhotoFilter] = useState('all')
  const [photos, setPhotos] = useState([])
  const [comments, setComments] = useState([])
  const [reactions, setReactions] = useState({})
  const [favorites, setFavorites] = useState([])
  const [lightbox, setLightbox] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [commentTable, setCommentTable] = useState('public')
  const [posting, setPosting] = useState(false)
  const [downloading, setDownloading] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [togglingFav, setTogglingFav] = useState(null)
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
      const [evRes, phRes, cmRes, rcRes, fvRes] = await Promise.all([
        fetch(`/api/event-name?eventId=${id}`),
        fetch(`/api/photos?eventId=${id}&role=host`),
        fetch(`/api/comments?eventId=${id}&table=all`),
        fetch(`/api/reactions?eventId=${id}`),
        fetch(`/api/favorites?eventId=${id}`),
      ])
      const [evData, phData, cmData, rcData, fvData] = await Promise.all([
        evRes.json(), phRes.json(), cmRes.json(), rcRes.json(), fvRes.json()
      ])

      setEvent(evData)

      // 卓名をevent-name APIから取得して反映
      const tableNames = evData.tableNames || Array.from({ length: evData.tables || 4 }, (_, i) => `${i + 1}卓`)
      const tableList = [
        { id: 'all',        name: '📋 全部',    color: '#555' },
        { id: 'public',     name: '📢 全体公開', color: '#e91e8c' },
        ...tableNames.map((n, i) => ({
          id: `table${i + 1}`,
          name: `🌸 ${n}`,
          color: TABLE_COLORS[i % TABLE_COLORS.length]
        })),
        { id: 'afterparty', name: '🎉 二次会', color: '#f44336' },
      ]
      setTables(tableList)
      setCommentTable('public')

      setPhotos(phData.photos || [])
      setComments(cmData.comments || [])
      setReactions(rcData.reactions || {})
      setFavorites(fvData.favorites || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const toggleFavorite = async (photoId) => {
    setTogglingFav(photoId)
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, photoId })
      })
      const data = await res.json()
      if (data.success) {
        setFavorites(prev =>
          data.action === 'added' ? [...prev, photoId] : prev.filter(f => f !== photoId)
        )
      }
    } catch (e) { console.error(e) }
    setTogglingFav(null)
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
        body: JSON.stringify({ fileId: photo.id, eventId: id, nick: session?.user?.name, isHost: true })
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

  const postComment = async () => {
    if (!newComment.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, table: commentTable, nick: `👑 ${session?.user?.name}`, text: newComment.trim() })
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

  const basePhotos = photos.filter(p => activeGroup === 'all' || p.group === activeGroup)
  const visiblePhotos = basePhotos.filter(p => photoFilter === 'best' ? favorites.includes(p.id) : true)
  const visibleComments = comments.filter(c => activeGroup === 'all' || c.table === activeGroup)
  const photoCount = (gid) => gid === 'all' ? photos.length : photos.filter(p => p.group === gid).length
  const bestCount = basePhotos.filter(p => favorites.includes(p.id)).length

  const reactionRanking = [...photos]
    .sort((a, b) => getReactionSummary(b.id).total - getReactionSummary(a.id).total)
    .filter(p => getReactionSummary(p.id).total > 0)
    .slice(0, 5)

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

      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 17 }}>💍 {event?.name || 'Wedding Photo'}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>👑 主催者 · 全{photos.length}枚 · ⭐{favorites.length}件</div>
          </div>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 12 }}>
            ← 戻る
          </button>
        </div>
        {/* 卓タブ */}
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

      {/* メインタブ */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #eee' }}>
        {[
          { id: 'photos',   label: '📷 写真',    count: visiblePhotos.length },
          { id: 'comments', label: '💬 掲示板',   count: visibleComments.length },
          { id: 'ranking',  label: '🏆 ランキング', count: null },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: '11px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12,
            fontWeight: activeTab === t.id ? 'bold' : 'normal',
            color: activeTab === t.id ? '#e91e8c' : '#888',
            borderBottom: activeTab === t.id ? '2.5px solid #e91e8c' : '2.5px solid transparent'
          }}>
            {t.label}
            {t.count !== null && <span style={{ marginLeft: 3, background: activeTab === t.id ? '#e91e8c' : '#eee', color: activeTab === t.id ? 'white' : '#999', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* 写真タブ */}
      {activeTab === 'photos' && (
        <>
          <div style={{ padding: '10px 12px 0', display: 'flex', gap: 8 }}>
            <button onClick={() => setPhotoFilter('all')} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: photoFilter === 'all' ? 'bold' : 'normal', background: photoFilter === 'all' ? '#555' : '#f0f0f0', color: photoFilter === 'all' ? 'white' : '#666' }}>
              📷 すべて ({basePhotos.length})
            </button>
            <button onClick={() => setPhotoFilter('best')} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: photoFilter === 'best' ? 'bold' : 'normal', background: photoFilter === 'best' ? '#f9a825' : '#f0f0f0', color: photoFilter === 'best' ? 'white' : '#666' }}>
              ⭐ ベスト ({bestCount})
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 10px 0' }}>
            {visiblePhotos.map(p => {
              const b = VIS_BADGE[p.visibility] || VIS_BADGE.public
              const isFav = favorites.includes(p.id)
              const { total, detail } = getReactionSummary(p.id)
              return (
                <div key={p.id} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: isFav ? '0 2px 12px rgba(249,168,37,0.3)' : '0 2px 8px rgba(0,0,0,0.07)', border: isFav ? '2px solid #f9a825' : 'none' }}>
                  <div style={{ position: 'relative' }} onClick={() => openLightbox(p)}>
                    <img src={p.url} alt={p.caption} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block', cursor: 'pointer' }} />
                    {isFav && <div style={{ position: 'absolute', top: 5, left: 5, background: '#f9a825', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⭐</div>}
                    <span style={{ position: 'absolute', top: 5, right: 5, fontSize: 10, background: b.bg, color: b.color, padding: '2px 6px', borderRadius: 8, fontWeight: 'bold' }}>{b.label}</span>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(p) }}
                      style={{ position: 'absolute', bottom: 5, right: 5, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: 'white', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ×
                    </button>
                  </div>
                  <div style={{ padding: '8px 10px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 'bold', color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{p.caption}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>{p.nick} · {p.ts}</div>

                    {/* リアクション表示（種類別＋総数） */}
                    {total > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 3 }}>
                          {REACTIONS.map(r => {
                            const count = (detail[r] || []).length
                            if (count === 0) return null
                            return (
                              <span key={r} style={{ fontSize: 11, background: '#f5f5f5', borderRadius: 20, padding: '2px 7px', color: '#666', display: 'flex', alignItems: 'center', gap: 2 }}>
                                {r} <span style={{ fontWeight: 'bold' }}>{count}</span>
                              </span>
                            )
                          })}
                        </div>
                        <div style={{ fontSize: 11, color: '#e91e8c', fontWeight: 'bold' }}>合計 {total} リアクション</div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleFavorite(p.id)} disabled={togglingFav === p.id}
                        style={{ flex: 1, padding: '5px', borderRadius: 8, border: `1.5px solid ${isFav ? '#f9a825' : '#eee'}`, background: isFav ? '#fff8e1' : 'white', color: isFav ? '#f9a825' : '#aaa', fontSize: 12, cursor: 'pointer', fontWeight: isFav ? 'bold' : 'normal' }}>
                        {isFav ? '⭐ ベスト' : '☆ 選ぶ'}
                      </button>
                      <button onClick={() => downloadPhoto(p)} disabled={downloading === p.id}
                        style={{ flex: 1, padding: '5px', borderRadius: 8, border: '1px solid #e91e8c', background: 'white', color: '#e91e8c', fontSize: 11, cursor: 'pointer', fontWeight: 'bold' }}>
                        {downloading === p.id ? '⏳' : '⬇️'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {visiblePhotos.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: '#ccc' }}>
                <div style={{ fontSize: 40 }}>📷</div>
                <div style={{ marginTop: 8 }}>まだ写真がありません</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 掲示板タブ */}
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

      {/* ランキングタブ */}
      {activeTab === 'ranking' && (
        <div style={{ padding: '12px 14px' }}>

          {/* ランキング種別タブ */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }}>
            {[
              { id: 'total', label: '🏆 総合' },
              { id: '❤️',   label: '❤️ ランキング' },
              { id: '👏',   label: '👏 ランキング' },
              { id: '😆',   label: '😆 ランキング' },
            ].map(t => (
              <button key={t.id} onClick={() => setRankingFilter(t.id)} style={{
                padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap', fontSize: 13, fontWeight: rankingFilter === t.id ? 'bold' : 'normal',
                background: rankingFilter === t.id ? '#f9a825' : '#f0f0f0',
                color: rankingFilter === t.id ? 'white' : '#666',
                flexShrink: 0,
              }}>{t.label}</button>
            ))}
          </div>

          {/* ランキングヘッダー */}
          <div style={{ background: 'linear-gradient(90deg,#f9a825,#fb8c00)', borderRadius: 14, padding: '12px 16px', marginBottom: 14, color: 'white' }}>
            <div style={{ fontWeight: 'bold', fontSize: 15 }}>
              {rankingFilter === 'total' ? '🏆 総合ランキング TOP5' :
               rankingFilter === '❤️' ? '❤️ ランキング TOP5' :
               rankingFilter === '👏' ? '👏 ランキング TOP5' :
               '😆 ランキング TOP5'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
              {rankingFilter === 'total' ? '全リアクション合計順' : `${rankingFilter} の数順`}
            </div>
          </div>

          {/* ランキングリスト */}
          {(() => {
            // フィルターに応じてソート
            const ranked = [...photos]
              .map(p => {
                const { total, detail } = getReactionSummary(p.id)
                const score = rankingFilter === 'total'
                  ? total
                  : (detail[rankingFilter] || []).length
                return { ...p, score, detail, total }
              })
              .filter(p => p.score > 0)
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)

            if (ranked.length === 0) return (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#ccc' }}>
                <div style={{ fontSize: 36 }}>🏆</div>
                <div style={{ marginTop: 8 }}>まだリアクションがありません</div>
              </div>
            )

            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
            return ranked.map((p, idx) => {
              const isFav = favorites.includes(p.id)
              return (
                <div key={p.id} onClick={() => openLightbox(p)} style={{ background: 'white', borderRadius: 16, padding: 14, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', border: isFav ? '2px solid #f9a825' : 'none' }}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{medals[idx]}</div>
                  <img src={p.url} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 13, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.caption}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>{p.nick}</div>

                    {/* 種類別リアクション */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                      {REACTIONS.map(r => {
                        const count = (p.detail[r] || []).length
                        if (count === 0) return null
                        return (
                          <span key={r} style={{
                            fontSize: 12, borderRadius: 20, padding: '2px 8px',
                            background: rankingFilter === r ? '#fff8e1' : '#f5f5f5',
                            color: rankingFilter === r ? '#f9a825' : '#666',
                            fontWeight: rankingFilter === r ? 'bold' : 'normal',
                            border: rankingFilter === r ? '1px solid #f9a825' : 'none',
                            display: 'flex', alignItems: 'center', gap: 2,
                          }}>
                            {r} <span style={{ fontWeight: 'bold' }}>{count}</span>
                          </span>
                        )
                      })}
                    </div>

                    {/* スコア表示 */}
                    <div style={{ fontSize: 12, color: '#f9a825', fontWeight: 'bold' }}>
                      {rankingFilter === 'total'
                        ? `合計 ${p.total} リアクション`
                        : `${rankingFilter} ${p.score}件`
                      }
                    </div>
                  </div>

                  {/* お気に入りボタン */}
                  <button onClick={e => { e.stopPropagation(); toggleFavorite(p.id) }} disabled={togglingFav === p.id}
                    style={{ background: isFav ? '#fff8e1' : 'white', border: `1.5px solid ${isFav ? '#f9a825' : '#eee'}`, color: isFav ? '#f9a825' : '#aaa', padding: '5px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: isFav ? 'bold' : 'normal', flexShrink: 0 }}>
                    {isFav ? '⭐' : '☆'}
                  </button>
                </div>
              )
            })
          })()}

          {/* ベスト写真まとめ */}
          {favorites.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 10 }}>⭐ 選んだベスト写真（{favorites.length}枚）</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {photos.filter(p => favorites.includes(p.id)).map(p => (
                  <div key={p.id} onClick={() => openLightbox(p)} style={{ borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '2px solid #f9a825', position: 'relative' }}>
                    <img src={p.url} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    {/* リアクション合計 */}
                    {getReactionSummary(p.id).total > 0 && (
                      <div style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 10, borderRadius: 8, padding: '1px 5px' }}>
                        {getReactionSummary(p.id).total}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
