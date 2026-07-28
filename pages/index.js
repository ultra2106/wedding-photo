export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth, googleProvider } from '../lib/firebase'
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/dashboard')
      } else {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [])

  const handleLogin = async () => {
    setSigning(true)
    try {
      await signInWithPopup(auth, googleProvider)
      // onAuthStateChanged が dashboard へリダイレクトしてくれる
    } catch (e) {
      console.error(e)
      alert('ログインに失敗しました。もう一度お試しください。')
      setSigning(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#aaa' }}>
        <div style={{ fontSize: 40 }}>💍</div>
        <div style={{ marginTop: 8 }}>読み込み中...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fff0f6,#f3e8ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 36, width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(233,30,140,0.12)', textAlign: 'center' }}>

        <div style={{ fontSize: 56, marginBottom: 12 }}>💍</div>
        <h1 style={{ margin: '0 0 4px', color: '#c2185b', fontSize: 26 }}>Wedding Photo</h1>
        <p style={{ color: '#aaa', fontSize: 14, margin: '0 0 32px' }}>結婚式の思い出を卓ごとに共有</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32, textAlign: 'left' }}>
          {[
            { icon: '📱', text: 'QRコードをスキャンするだけで参加' },
            { icon: '🌸', text: '卓ごとにアルバムを自動整理' },
            { icon: '☁️', text: '写真はあなたのGoogleドライブに保存' },
            { icon: '🔒', text: '卓限定・全体公開を選べる' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#faf4ff', borderRadius: 12 }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <span style={{ fontSize: 14, color: '#555' }}>{f.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleLogin}
          disabled={signing}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1.5px solid #ddd', background: 'white', fontSize: 15, fontWeight: 'bold', cursor: signing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12, opacity: signing ? 0.7 : 1 }}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.8 0 6.9 5.4 3 13.3l7.8 6C12.8 13.3 17.9 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 6.9-10.1 7.1-17.5z"/>
            <path fill="#FBBC05" d="M10.8 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7L2.5 13.3A24 24 0 0 0 0 24c0 3.8.9 7.4 2.5 10.7l8.3-6z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.1 0-11.2-3.8-13.2-9.2l-7.8 6C6.9 42.6 14.8 48 24 48z"/>
          </svg>
          {signing ? 'ログイン中...' : '主催者としてGoogleログイン'}
        </button>

        <p style={{ color: '#bbb', fontSize: 12, margin: '0 0 16px' }}>
          ゲストはQRコードをスキャンするだけ！<br />Googleアカウント不要です。
        </p>

        <p style={{ margin: 0, fontSize: 12 }}>
          <a href="/privacy" style={{ color: '#bbb', textDecoration: 'underline' }}>プライバシーポリシー</a>
          　｜　
          <a href="/how-to-use" style={{ color: '#bbb', textDecoration: 'underline' }}>使い方</a>
        </p>

      </div>
    </div>
  )
}
