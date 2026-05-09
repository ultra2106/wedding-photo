export const dynamic = ‘force-dynamic’

import { useRouter } from ‘next/router’
import { useState, useEffect, useRef } from ‘react’

const VIS_BADGE = {
public: { label: ‘🌐 全員’, bg: ‘#e8f5e9’, color: ‘#2e7d32’ },
table:  { label: ‘👥 卓限定’, bg: ‘#e3f2fd’, color: ‘#1565c0’ },
host:   { label: ‘🔒 主催者’, bg: ‘#fce4ec’, color: ‘#b71c1c’ },
}

export default function GuestPage() {
const router = useRouter()
const { id, table } = router.query
const [nick, setNick] = useState(’’)
const [loggedIn, setLoggedIn] = useState(false)
const [userTable, setUserTable] = useState(table || ‘table1’)
const [eventName, setEventName] = useState(’’)
const [photos, setPhotos] = useState([])
const [comments, setComments] = useState([])
const [activeTab, setActiveTab] = useState(‘photos’)
const [lightbox, setLightbox] = useState(null)
const [lightboxIndex, setLightboxIndex] = useState(0)
const [uploadOpen, setUploadOpen] = useState(false)
const [newCap, setNewCap] = useState(’’)
const [newVis, setNewVis] = useState(‘public’)
const [selectedFiles, setSelectedFiles] = useState([])
const [uploading, setUploading] = useState(false)
const [newComment, setNewComment] = useState(’’)
const [posting, setPosting] = useState(false)
const [downloading, setDownloading] = useState(null)
const [deleting, setDeleting] = useState(null)
const [confirmDelete, setConfirmDelete] = useState(null)
const fileRef = useRef()
const touchStartX = useRef(null)
const intervalRef = useRef(null)

useEffect(() => { if (table) setUserTable(table) }, [table])

useEffect(() => {
if (loggedIn && id) {
fetchPhotos()
fetchComments()
fetchEventName()
intervalRef.current = setInterval(() => {
fetchPhotos()
fetchComments()
}, 30000)
}
return () => clearInterval(intervalRef.current)
}, [loggedIn, id])

const fetchEventName = async () => {
try {
const res = await fetch(`/api/event-name?eventId=${id}`)
const data = await res.json()
if (data.name) setEventName(data.name)
} catch (e) {}
}

const fetchPhotos = async () => {
try {
const res = await fetch(`/api/photos?eventId=${id}&table=${userTable}`)
const data = await res.json()
setPhotos(data.photos || [])
} catch (e) { console.error(e) }
}

const fetchComments = async () => {
try {
const res = await fetch(`/api/comments?eventId=${id}&table=${userTable}`)
const data = await res.json()
setComments(data.comments || [])
} catch (e) { console.error(e) }
}

const downloadPhoto = async (photo) => {
setDownloading(photo.id)
try {
const response = await fetch(photo.url)
const blob = await response.blob()
const url = URL.createObjectURL(blob)
const a = document.createElement(‘a’)
a.href = url
a.download = `${photo.caption || 'photo'}.jpg`
a.click()
URL.revokeObjectURL(url)
} catch (e) { alert(‘ダウンロードに失敗しました’) }
setDownloading(null)
}

const deletePhoto = async (photo) => {
setDeleting(photo.id)
try {
const res = await fetch(’/api/delete-photo’, {
method: ‘DELETE’,
headers: { ‘Content-Type’: ‘application/json’ },
body: JSON.stringify({ fileId: photo.id, eventId: id, nick, isHost: false })
})
const data = await res.json()
if (data.success) {
setPhotos(prev => prev.filter(p => p.id !== photo.id))
setConfirmDelete(null)
if (lightbox?.id === photo.id) setLightbox(null)
} else {
alert(data.error || ‘削除できませんでした’)
}
} catch (e) { alert(‘削除に失敗しました’) }
setDeleting(null)
}

const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
const handleTouchEnd = (e) => {
if (touchStartX.current === null) return
const diff = touchStartX.current - e.changedTouches[0].clientX
if (Math.abs(diff) > 50) {
if (diff > 0) setLightboxIndex(i => Math.min(i + 1, photos.length - 1))
else setLightboxIndex(i => Math.max(i - 1, 0))
}
touchStartX.current = null
}

const openLightbox = (photo) => {
const idx = photos.findIndex(p => p.id === photo.id)
setLightboxIndex(idx)
setLightbox(photo)
}

useEffect(() => {
if (lightbox) setLightbox(photos[lightboxIndex])
}, [lightboxIndex])

const handleFiles = (e) => {
const files = Array.from(e.target.files).map(f => ({
file: f, preview: URL.createObjectURL(f), name: f.name,
}))
setSelectedFiles(files)
e.target.value = ‘’
}

const submitUpload = async () => {
if (!selectedFiles.length) return
setUploading(true)
try {
for (const f of selectedFiles) {
const base64 = await new Promise(res => {
const reader = new FileReader()
reader.onload = () => res(reader.result.split(’,’)[1])
reader.readAsDataURL(f.file)
})
await fetch(’/api/upload’, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’ },
body: JSON.stringify({
eventId: id, fileName: f.name, fileData: base64,
mimeType: f.file.type, group: userTable,
caption: newCap, visibility: newVis, nick,
})
})
}
setUploadOpen(false)
setSelectedFiles([])
setNewCap(’’)
fetchPhotos()
} catch (e) { alert(‘アップロードに失敗しました’) }
setUploading(false)
}

const postComment = async () => {
if (!newComment.trim()) return
setPosting(true)
try {
const res = await fetch(’/api/comments’, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’ },
body: JSON.stringify({ eventId: id, table: userTable, nick, text: newComment.trim() })
})
const data = await res.json()
if (data.success) {
setComments(prev => [data.comment, …prev])
setNewComment(’’)
}
} catch (e) { alert(‘投稿に失敗しました’) }
setPosting(false)
}

const tableLabel = () => {
if (userTable === ‘public’) return ‘📢 全体公開’
if (userTable === ‘afterparty’) return ‘🎉 二次会’
return `🌸 ${userTable.replace('table', '')}卓`
}

if (!loggedIn) return (
<div style={{ minHeight: ‘100dvh’, background: ‘linear-gradient(160deg,#fff0f6,#f3e8ff)’, display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’, padding: 20, fontFamily: ‘sans-serif’ }}>
<div style={{ background: ‘white’, borderRadius: 24, padding: 28, width: ‘100%’, maxWidth: 360, boxShadow: ‘0 8px 40px rgba(233,30,140,0.12)’ }}>
<div style={{ textAlign: ‘center’, marginBottom: 24 }}>
<div style={{ fontSize: 48 }}>💍</div>
<h2 style={{ margin: ‘8px 0 4px’, color: ‘#c2185b’, fontSize: 22 }}>Wedding Photo</h2>
<p style={{ color: ‘#aaa’, fontSize: 13, margin: 0 }}>{tableLabel()} のアルバム</p>
</div>
<input placeholder=“ニックネームを入力” value={nick} onChange={e => setNick(e.target.value)}
onKeyDown={e => e.key === ‘Enter’ && nick.trim() && setLoggedIn(true)}
style={{ width: ‘100%’, padding: ‘13px 14px’, borderRadius: 12, border: ‘1.5px solid #eee’, fontSize: 16, boxSizing: ‘border-box’, marginBottom: 12, outline: ‘none’ }} />
<button onClick={() => nick.trim() && setLoggedIn(true)} disabled={!nick.trim()}
style={{ width: ‘100%’, padding: 14, borderRadius: 12, border: ‘none’, background: nick.trim() ? ‘linear-gradient(90deg,#e91e8c,#9c27b0)’ : ‘#ddd’, color: ‘white’, fontWeight: ‘bold’, fontSize: 16, cursor: nick.trim() ? ‘pointer’ : ‘default’ }}>
入場する 🎊
</button>
<p style={{ color: ‘#bbb’, fontSize: 12, textAlign: ‘center’, marginTop: 12 }}>Googleアカウント不要です</p>
</div>
</div>
)

return (
<div style={{ minHeight: ‘100dvh’, background: ‘#f5f5f5’, fontFamily: ‘sans-serif’, paddingBottom: 80 }}>

```
  <div style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <div style={{ fontWeight: 'bold', fontSize: 17 }}>💍 {eventName || 'Wedding Photo'}</div>
      <div style={{ fontSize: 11, opacity: 0.8 }}>{nick} · {tableLabel()}</div>
    </div>
    <button onClick={() => setUploadOpen(true)}
      style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 'bold', cursor: 'pointer' }}>
      ＋ 追加
    </button>
  </div>

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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 10px 0' }}>
      {photos.map(p => {
        const b = VIS_BADGE[p.visibility] || VIS_BADGE.public
        const isMine = p.nick === nick
        return (
          <div key={p.id} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <div style={{ position: 'relative' }} onClick={() => openLightbox(p)}>
              <img src={p.url} alt={p.caption} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block', cursor: 'pointer' }} />
              <span style={{ position: 'absolute', top: 5, right: 5, fontSize: 10, background: b.bg, color: b.color, padding: '2px 6px', borderRadius: 8, fontWeight: 'bold' }}>{b.label}</span>
              {isMine && (
                <button onClick={e => { e.stopPropagation(); setConfirmDelete(p) }}
                  style={{ position: 'absolute', top: 5, left: 5, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: 'white', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ×
                </button>
              )}
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
      {photos.length === 0 && (
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
        {lightboxIndex < photos.length - 1 && (
          <button onClick={() => setLightboxIndex(i => i + 1)}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 40, height: 40, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>›</button>
        )}
      </div>
      <img src={lightbox.url} style={{ maxWidth: '100%', maxHeight: '65dvh', borderRadius: 12, objectFit: 'contain' }} />
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 }}>{lightboxIndex + 1} / {photos.length}</div>
      <div style={{ color: 'white', marginTop: 8, textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 'bold' }}>{lightbox.caption}</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{lightbox.nick} · {lightbox.ts}</div>
        <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => downloadPhoto(lightbox)} disabled={downloading === lightbox?.id}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 18px', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>
            {downloading === lightbox?.id ? '⏳' : '⬇️ 保存'}
          </button>
          {lightbox?.nick === nick && (
            <button onClick={() => { setLightbox(null); setConfirmDelete(lightbox) }}
              style={{ background: 'rgba(220,50,50,0.5)', border: 'none', color: 'white', padding: '8px 18px', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>
              🗑️ 削除
            </button>
          )}
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

  {/* Upload Modal */}
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
```

)
}
