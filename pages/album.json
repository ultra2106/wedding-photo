import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

const GROUPS = [
  { id: 'table1',     name: '🌸 1卓',    color: '#9c27b0' },
  { id: 'table2',     name: '🌿 2卓',    color: '#43a047' },
  { id: 'table3',     name: '🌟 3卓',    color: '#fb8c00' },
  { id: 'table4',     name: '💫 4卓',    color: '#00acc1' },
  { id: 'afterparty', name: '🎉 二次会', color: '#f44336' },
]

const VIS_BADGE = {
  public: { label: '🌐 全員',   bg: '#e8f5e9', color: '#2e7d32' },
  table:  { label: '👥 卓限定', bg: '#e3f2fd', color: '#1565c0' },
  host:   { label: '🔒 主催者', bg: '#fce4ec', color: '#b71c1c' },
}

function canView(photo, user) {
  if (user.isHost) return true
  if (photo.visibility === 'host') return false
  if (photo.visibility === 'public') return true
  return photo.group === user.table
}

export default function Album() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [photos, setPhotos] = useState([])
  const [activeGroup, setActiveGroup] = useState('all')
  const [lightbox, setLightbox] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [newCap, setNewCap] = useState('')
  const [newVis, setNewVis] = useState('public')
  const [newGrp, setNewGrp] = useState('table1')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef()
  const [selectedFiles, setSelectedFiles] = useState([])

  // ログイン情報を取得
  useEffect(() => {
    const stored = sessionStorage.getItem('user')
    if (!stored) { router.push('/'); return }
    const u = JSON.parse(stored)
    setUser(u)
    setActiveGroup(u.isHost ? 'all' : u.table)
    fetchPhotos(u)
  }, [])

  // 写真をAPIから取得
  const fetchPhotos = async (u) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/photos?role=${u.isHost ? 'host' : 'guest'}&table=${u.table || ''}`)
      const data = await res.json()
      setPhotos(data.photos || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  // ファイル選択
  const handleFiles = (e) => {
    const files = Array.from(e.target.files).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      name: f.name,
    }))
    setSelectedFiles(files)
    e.target.value = ''
  }

  // アップロード
  const submitUpload = async () => {
    if (!selectedFiles.length) return
    setUploading(true)
    try {
      for (const f of selectedFiles) {
        const base64 = await new Promise((res) => {
          const reader = new FileReader()
          reader.onload = () => res(reader.result.split(',')[1])
          reader.readAsDataURL(f.file)
        })
        await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: f.name,
            fileData: base64,
            mimeType: f.file.type,
            group: newGrp,
            caption: newCap,
            visibility: newVis,
            nick: user.nick,
          })
        })
      }
      setUploadOpen(false)
      setSelectedFiles([])
      setNewCap('')
      fetchPhotos(user)
    } catch (e) {
      alert('アップロードに失敗しました')
    }
    setUploading(false)
  }

  if (!user) return null

  const visible = photos.filter(p =>
    canView(p, user) && (activeGroup === 'all' || p.group === activeGroup)
  )
  const groupCount = (gid) => photos.filter(p =>
    canView(p, user) && (gid === 'all' || p.group === gid)
  ).length

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', fontFamily: 'sans-serif', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 17 }}>💍 Wedding Photo</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>{user.nick} · {user.isHost ? '👑 主催者' : GROUPS.find(g => g.id === user.table)?.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {user.isHost && (
            <button onClick={() => setQrOpen(true)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '7px 12px', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>QR</button>
          )}
          <button onClick={() => { setUploadOpen(true); setNewGrp(user.isHost ? 'table1' : user.table) }}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 'bold', cursor: 'pointer' }}>
            ＋ 追加
          </button>
        </div>
      </div>

      {/* Group Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #eee', padding: '8px 10px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        <button onClick={() => setActiveGroup('all')} style={{ padding: '7px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12, fontWeight: activeGroup === 'all' ? 'bold' : 'normal', background: activeGroup === 'all' ? '#555' : '#f0f0f0', color: activeGroup === 'all' ? 'white' : '#666' }}>
          📋 すべて ({groupCount('all')})
        </button>
        {GROUPS.filter(g => user.isHost || g.id === user.table || photos.some(p => p.group === g.id && p.visibility === 'public')).map(g => (
          <button key={g.id} onClick={() => setActiveGroup(g.id)} style={{ padding: '7px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12, fontWeight: activeGroup === g.id ? 'bold' : 'normal', background: activeGroup === g.id ? g.color : '#f0f0f0', color: activeGroup === g.id ? 'white' : '#666' }}>
            {g.name} ({groupCount(g.id)})
          </button>
        ))}
      </div>

      {/* Photo Grid */}
      <div style={{ padding: '10px 10px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#ccc' }}>
            <div style={{ fontSize: 32 }}>⏳</div>
            <div style={{ marginTop: 8 }}>読み込み中...</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {visible.map(p => {
              const b = VIS_BADGE[p.visibility] || VIS_BADGE.public
              return (
                <div key={p.id} onClick={() => setLightbox(p)} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', cursor: 'pointer' }}>
                  <div style={{ position: 'relative' }}>
                    <img src={p.url} alt={p.caption} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                    <span style={{ position: 'absolute', top: 5, right: 5, fontSize: 10, background: b.bg, color: b.color, padding: '2px 6px', borderRadius: 8, fontWeight: 'bold' }}>{b.label}</span>
                  </div>
                  <div style={{ padding: '8px 10px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 'bold', color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{p.caption}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>{p.nick} · {p.ts}</div>
                  </div>
                </div>
              )
            })}
            {visible.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: '#ccc' }}>
                <div style={{ fontSize: 40 }}>📷</div>
                <div style={{ marginTop: 8 }}>まだ写真がありません</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <img src={lightbox.url} alt={lightbox.caption} style={{ maxWidth: '100%', maxHeight: '68dvh', borderRadius: 12, objectFit: 'contain' }} />
          <div style={{ color: 'white', marginTop: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>{lightbox.caption}</div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{lightbox.nick} · {lightbox.ts}</div>
            <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'center' }}>
              <a href={lightbox.url} download style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '8px 18px', borderRadius: 20, fontSize: 13, textDecoration: 'none' }}>⬇️ 保存</a>
              <button onClick={() => setLightbox(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 18px', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>✕ 閉じる</button>
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
            <select value={newGrp} onChange={e => setNewGrp(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #eee', fontSize: 15, boxSizing: 'border-box', marginBottom: 8, background: 'white' }}>
              {GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select value={newVis} onChange={e => setNewVis(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #eee', fontSize: 15, boxSizing: 'border-box', marginBottom: 14, background: 'white' }}>
              <option value="public">🌐 全員に公開</option>
              <option value="table">👥 この卓と主催者のみ</option>
              {user.isHost && <option value="host">🔒 主催者のみ</option>}
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

      {/* QR Modal */}
      {qrOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && setQrOpen(false)}>
          <div style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: '20px 16px 36px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: 36, height: 4, background: '#ddd', borderRadius: 2, margin: '0 auto 16px' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: 17 }}>📱 QRコード一覧</h3>
            <p style={{ color: '#aaa', fontSize: 12, margin: '0 0 16px' }}>各卓に印刷して設置してください</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {GROUPS.map(g => (
                <div key={g.id} style={{ background: '#fafafa', borderRadius: 14, padding: 14, textAlign: 'center', border: `2px solid ${g.color}33` }}>
                  <div style={{ fontSize: 14, fontWeight: 'bold', color: g.color, marginBottom: 8 }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>{process.env.NEXT_PUBLIC_BASE_URL}/?table={g.id}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setQrOpen(false)} style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 12, border: 'none', background: '#f0f0f0', cursor: 'pointer', fontSize: 15 }}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  )
}
