export const dynamic = 'force-dynamic'

import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'

const GROUPS = [
  { id: 'public', name: '📢 全体', color: '#e91e8c' },
  { id: 'table1', name: '🌸 1卓', color: '#9c27b0' },
  { id: 'table2', name: '🌿 2卓', color: '#43a047' },
  { id: 'table3', name: '🌟 3卓', color: '#fb8c00' },
  { id: 'table4', name: '💫 4卓', color: '#00acc1' },
  { id: 'afterparty', name: '🎉 二次会', color: '#f44336' },
]

const VIS_BADGE = {
  public: { label: '🌐 全員', bg: '#e8f5e9', color: '#2e7d32' },
  table: { label: '👥 卓限定', bg: '#e3f2fd', color: '#1565c0' },
  host: { label: '🔒 主催者', bg: '#fce4ec', color: '#b71c1c' },
}

export default function GuestPage() {
  const router = useRouter()
  const { id, table } = router.query
  const [nick, setNick] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [userTable, setUserTable] = useState(table || 'table1')
  const [photos, setPhotos] = useState([])
  const [activeGroup, setActiveGroup] = useState('all')
  const [lightbox, setLightbox] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [newCap, setNewCap] = useState('')
  const [newVis, setNewVis] = useState('public')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (table) setUserTable(table)
  }, [table])

  useEffect(() => {
    if (loggedIn && id) fetchPhotos()
  }, [loggedIn, id])

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`/api/photos?eventId=${id}&table=${userTable}`)
      const data = await res.json()
      setPhotos(data.photos || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleFiles = (e) => {
    const files = Array.from(e.target.files).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      name: f.name,
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
            eventId: id,
            fileName: f.name,
            fileData: base64,
            mimeType: f.file.type,
            group: userTable,
            caption: newCap,
            visibility: newVis,
            nick,
          })
        })
      }
      setUploadOpen(false)
      setSelectedFiles([])
      setNewCap('')
      fetchPhotos()
    } catch (e) {
      alert('アップロードに失敗しました')
    }
    setUploading(false)
  }

  const groupColor = GROUPS.find(g => g.id === activeGroup)?.color || '#e91e8c'

  // ログイン画面
  if (!loggedIn) return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(160deg,#fff0f6,#f3e8ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, boxShadow: '0 8px 40px rgba(233,30,140,0.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48 }}>💍</div>
          <h2 style={{ margin: '8px 0 4px', color: '#c2185b', fontSize: 22 }}>Wedding Photo</h2>
          <p style={{ color: '#aaa', fontSize: 13, margin: 0 }}>
            {GROUPS.find(g => g.id === userTable)?.name || userTable} のアルバム
          </p>
        </div>
        <input
          placeholder="ニックネームを入力"
          value={nick}
          onChange={e => setNick(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && nick.trim() && setLoggedIn(true)}
          style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: '1.5px solid #eee', fontSize: 16, boxSizing: 'border-box', marginBottom: 12, outline: 'none' }}
        />
        <button onClick={() => nick.trim() && setLoggedIn(true)} disabled={!nick.trim()}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: nick.trim() ? 'linear-gradient(90deg,#e91e8c,#9c27b0)' : '#ddd', color: 'white', fontWeight: 'bold', fontSize: 16, cursor: nick.trim() ? 'pointer' : 'default' }}>
          入場する 🎊
        </button>
        <p style={{ color: '#bbb', fontSize: 12, textAlign: 'center', marginTop: 12 }}>Googleアカウント不要です</p>
      </div>
    </div>
  )

  const visible = photos.filter(p => activeGroup === 'all' || p.group === activeGroup)

  // アルバム画面
  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', fontFamily: 'sans-serif', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 17 }}>💍 Wedding Photo</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>{nick} · {GROUPS.find(g => g.id === userTable)?.name}</div>
        </div>
        <button onClick={() => setUploadOpen(true)}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 'bold', cursor: 'pointer' }}>
          ＋ 追加
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #eee', padding: '8px 10px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        <button onClick={() => setActiveGroup('all')} style={{ padding: '7px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12, fontWeight: activeGroup === 'all' ? 'bold' : 'normal', background: activeGroup === 'all' ? '#555' : '#f0f0f0', color: activeGroup === 'all' ? 'white' : '#666' }}>
          📋 すべて
        </button>
        {GROUPS.map(g => (
          <button key={g.id} onClick={() => setActiveGroup(g.id)} style={{ padding: '7px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12, fontWeight: activeGroup === g.id ? 'bold' : 'normal', background: activeGroup === g.id ? g.color : '#f0f0f0', color: activeGroup === g.id ? 'white' : '#666' }}>
            {g.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 10px 0' }}>
        {visible.map(p => {
          const b = VIS_BADGE[p.visibility] || VIS_BADGE.public
          return (
            <div key={p.id} onClick={() => setLightbox(p)} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', cursor: 'pointer' }}>
              <div style={{ position: 'relative' }}>
                <img src={p.url} alt={p.caption} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                <span style={{ position: 'absolute', top: 5, right: 5, fontSize: 10, background: b.bg, color: b.color, padding: '2px 6px', borderRadius: 8, fontWeight: 'bold' }}>{b.label}</span>
              </div>
              <div style={{ padding: '8px 10px 10px' }}>
                <div style={{ fontSize: 12, fontWeight: 'bold', color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.caption}</div>
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

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <img src={lightbox.url} style={{ maxWidth: '100%', maxHeight: '68dvh', borderRadius: 12, objectFit: 'contain' }} />
          <div style={{ color: 'white', marginTop: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>{lightbox.caption}</div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{lightbox.nick} · {lightbox.ts}</div>
            <button onClick={() => setLightbox(null)} style={{ marginTop: 12, background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 18px', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>✕ 閉じる</button>
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
  )
}
