import { useRouter } from 'next/router'
import { useState } from 'react'

const GROUPS = [
  { id: 'table1', name: '🌸 1卓' },
  { id: 'table2', name: '🌿 2卓' },
  { id: 'table3', name: '🌟 3卓' },
  { id: 'table4', name: '💫 4卓' },
  { id: 'afterparty', name: '🎉 二次会' },
]

export default function Login() {
  const router = useRouter()
  const { table } = router.query
  const [nick, setNick] = useState('')
  const [selTable, setSelTable] = useState(table || 'table1')
  const [isHost, setIsHost] = useState(false)

  const login = () => {
    if (!nick.trim()) return
    sessionStorage.setItem('user', JSON.stringify({
      nick, isHost, table: isHost ? null : selTable
    }))
    router.push('/album')
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#fff0f6,#f3e8ff)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'sans-serif' }}>
      <div style={{ background:'white', borderRadius:24, padding:32, width:'100%', maxWidth:380, boxShadow:'0 8px 40px rgba(233,30,140,0.12)' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:52 }}>💍</div>
          <h2 style={{ margin:'8px 0 2px', color:'#c2185b' }}>Wedding Photo</h2>
          <p style={{ color:'#aaa', fontSize:13, margin:0 }}>ニックネームを入力してください</p>
        </div>
        <input placeholder="ニックネーム" value={nick} onChange={e=>setNick(e.target.value)}
          style={{ width:'100%', padding:'13px 14px', borderRadius:12, border:'1.5px solid #eee', fontSize:16, boxSizing:'border-box', marginBottom:10, outline:'none' }}/>
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, marginBottom:10, cursor:'pointer' }}>
          <input type="checkbox" checked={isHost} onChange={e=>setIsHost(e.target.checked)}/>
          👑 主催者としてログイン
        </label>
        {!isHost && (
          <select value={selTable} onChange={e=>setSelTable(e.target.value)}
            style={{ width:'100%', padding:'13px 14px', borderRadius:12, border:'1.5px solid #eee', fontSize:15, boxSizing:'border-box', marginBottom:12, background:'white' }}>
            {GROUPS.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <button onClick={login} disabled={!nick.trim()}
          style={{ width:'100%', padding:14, borderRadius:12, border:'none', background:nick.trim()?'linear-gradient(90deg,#e91e8c,#9c27b0)':'#ddd', color:'white', fontWeight:'bold', fontSize:16, cursor:'pointer' }}>
          入場する 🎊
        </button>
      </div>
    </div>
  )
}
