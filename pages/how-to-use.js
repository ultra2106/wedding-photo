export const dynamic = 'force-dynamic'

import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

const STEPS_GUEST = [
  {
    icon: '📷',
    title: 'QRコードをスキャン',
    desc: '卓に置いてあるQRコードをカメラで読み取ります。アプリのインストールは不要です！',
    tip: 'iPhoneはカメラアプリ、Androidはカメラまたは標準のQRリーダーで読み取れます',
  },
  {
    icon: '😊',
    title: 'ニックネームを入力',
    desc: '好きなニックネームを入力して「入場する」を押すだけ。Googleアカウントは不要です。',
    tip: '次回同じブラウザで開くと自動入力されます',
  },
  {
    icon: '🌸',
    title: '写真を投稿しよう',
    desc: '右上の「＋追加」ボタンから写真を選んで投稿できます。全員公開か卓のメンバーだけに見せるかを選べます。',
    tip: '写真は結婚式当日のみ投稿できます',
  },
  {
    icon: '❤️',
    title: 'リアクションしよう',
    desc: '写真に❤️👏😆のリアクションを押せます。リアクションが多い写真はランキングに表示されます。',
    tip: 'もう一度押すとリアクションを取り消せます',
  },
  {
    icon: '💬',
    title: '掲示板でメッセージ',
    desc: '「掲示板」タブからメッセージを投稿できます。お祝いの言葉や二次会の情報などを共有しましょう。',
    tip: '主催者からのお知らせもここに届きます',
  },
  {
    icon: '⬇️',
    title: '写真を保存しよう',
    desc: '気に入った写真は「保存」ボタンでスマホに保存できます。大きく見たいときは写真をタップ！',
    tip: 'スワイプで前後の写真に移動できます',
  },
]

const STEPS_HOST = [
  {
    icon: '🔑',
    title: 'Googleでログイン',
    desc: 'トップページから主催者としてGoogleログインします。写真はあなたのGoogleドライブに保存されます。',
    tip: 'ログインに使ったGoogleアカウントのドライブに自動でフォルダが作成されます',
  },
  {
    icon: '🎊',
    title: 'イベントを作成',
    desc: 'ダッシュボードから結婚式名・日付・卓数を設定してイベントを作成します。卓名もカスタマイズできます。',
    tip: '卓数は後から変更できません。多めに設定しておくと安心です',
  },
  {
    icon: '📱',
    title: 'QRコードを印刷',
    desc: '各卓用のQRコードが自動生成されます。「保存」ボタンで画像をダウンロードして印刷してください。',
    tip: '式場のプリンターやコンビニ印刷でA4やカード形式に印刷できます',
  },
  {
    icon: '⭐',
    title: 'ベスト写真を選ぶ',
    desc: '主催者アルバムの「☆選ぶ」ボタンでベスト写真を選べます。ゲストもベスト写真タブで確認できます。',
    tip: '式の後でゆっくり選んでもOKです。ゲストへのサプライズ公開にも使えます',
  },
  {
    icon: '🏆',
    title: 'ランキングを確認',
    desc: 'ランキングタブでリアクションが多い人気写真を確認できます。総合・種類別で切り替えられます。',
    tip: '盛り上がったシーンや人気のゲストの写真が自然に上がってきます',
  },
]

const FEATURES_GUEST = [
  { icon: '🔒', title: '卓限定公開', desc: '自分の卓と主催者だけに見せる写真を投稿できます' },
  { icon: '⭐', title: 'ベスト写真', desc: '主催者が選んだベスト写真を全員で確認できます' },
  { icon: '🏆', title: 'ランキング', desc: 'リアクション数で人気写真をランキング表示します' },
  { icon: '🔄', title: '自動更新', desc: '30秒ごとに新しい写真やコメントが自動で表示されます' },
]

const FEATURES_HOST = [
  { icon: '📂', title: 'Drive自動保存', desc: 'ゲストの投稿写真がGoogleドライブに自動で保存されます' },
  { icon: '🗑️', title: '写真の管理', desc: '不適切な写真は主催者側で削除できます' },
  { icon: '📢', title: 'お知らせ投稿', desc: '掲示板から全ゲストにお知らせを送れます' },
  { icon: '🔄', title: 'リアルタイム同期', desc: '全ゲストの投稿・リアクションをリアルタイムで確認できます' },
]

// ── ゲスト向けページ ─────────────────────────────────────────
function GuestGuide({ onBack }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', fontFamily: 'sans-serif', paddingBottom: 60 }}>
      <div style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 17 }}>🌸 使い方ガイド（ゲスト向け）</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Wedding Photo</div>
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ background: 'linear-gradient(135deg,#e91e8c,#9c27b0)', borderRadius: 20, padding: '24px 20px', marginBottom: 24, textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🌸</div>
          <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 6 }}>ゲストの方へ</div>
          <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.7 }}>
            QRコードをスキャンするだけで<br />結婚式の写真を共有できます！<br />アプリのインストールは不要です。
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 14 }}>📋 使い方 ステップ</div>
          {STEPS_GUEST.map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#fff0f6,#f3e8ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', fontSize: 10, fontWeight: 'bold', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontWeight: 'bold', fontSize: 15, color: '#222' }}>{s.title}</span>
                </div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 6 }}>{s.desc}</div>
                <div style={{ fontSize: 11, color: '#9c27b0', background: '#f3e8ff', borderRadius: 8, padding: '4px 10px', display: 'inline-block' }}>
                  💡 {s.tip}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 14 }}>✨ 便利な機能</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FEATURES_GUEST.map((f, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 14, padding: '14px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{f.icon}</div>
                <div style={{ fontWeight: 'bold', fontSize: 13, color: '#333', marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 14 }}>❓ よくある質問</div>
          {[
            { q: 'Googleアカウントは必要ですか？', a: 'ゲストはGoogleアカウント不要です。ニックネームだけで参加できます。' },
            { q: '写真はどこに保存されますか？', a: '主催者のGoogleドライブに自動保存されます。式後もいつでも見られます。' },
            { q: '卓限定公開とは何ですか？', a: 'その卓のメンバーと主催者のみが見られる写真です。全員公開にすると全ゲストが見られます。' },
            { q: '写真を誤って投稿した場合は？', a: '自分が投稿した写真は写真の×ボタンで削除できます。' },
            { q: '写真はいつでも投稿できますか？', a: '主催者が設定した日時以降に投稿できます。通常は結婚式当日のみ投稿可能です。' },
          ].map((faq, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 'bold', fontSize: 13, color: '#e91e8c', marginBottom: 6 }}>Q. {faq.q}</div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>A. {faq.a}</div>
            </div>
          ))}
        </div>

        <button onClick={onBack}
          style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>
          ← ニックネーム入力に戻る
        </button>
      </div>
    </div>
  )
}

// ── ホスト向けページ ─────────────────────────────────────────
function HostGuide({ onBack }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', fontFamily: 'sans-serif', paddingBottom: 60 }}>
      <div style={{ background: 'linear-gradient(90deg,#7b1fa2,#4a148c)', color: 'white', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 17 }}>👑 使い方ガイド（主催者向け）</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Wedding Photo</div>
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ background: 'linear-gradient(135deg,#7b1fa2,#4a148c)', borderRadius: 20, padding: '24px 20px', marginBottom: 24, textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>👑</div>
          <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 6 }}>主催者の方へ</div>
          <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.7 }}>
            Googleログインしてイベントを作成するだけ。<br />QRコードを印刷して卓に置けば準備完了！<br />ゲストの写真はドライブに自動保存されます。
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 14 }}>📋 セットアップ手順</div>
          {STEPS_HOST.map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#f3e8ff,#e8f4fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ background: 'linear-gradient(90deg,#7b1fa2,#4a148c)', color: 'white', fontSize: 10, fontWeight: 'bold', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontWeight: 'bold', fontSize: 15, color: '#222' }}>{s.title}</span>
                </div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 6 }}>{s.desc}</div>
                <div style={{ fontSize: 11, color: '#7b1fa2', background: '#f3e8ff', borderRadius: 8, padding: '4px 10px', display: 'inline-block' }}>
                  💡 {s.tip}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 14 }}>✨ 主催者の機能</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FEATURES_HOST.map((f, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 14, padding: '14px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{f.icon}</div>
                <div style={{ fontWeight: 'bold', fontSize: 13, color: '#333', marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 14 }}>❓ よくある質問</div>
          {[
            { q: 'どのGoogleアカウントでログインすればいいですか？', a: '写真を保存したいGoogleドライブのアカウントでログインしてください。' },
            { q: '卓数は後から変更できますか？', a: '卓数はイベント作成後の変更ができません。多めに設定しておくことをおすすめします。' },
            { q: 'ゲストが不適切な写真を投稿した場合は？', a: '主催者アルバムから任意の写真を削除できます。' },
            { q: 'イベント終了後も写真は見られますか？', a: 'Googleドライブに保存されているため、式後もいつでもアクセスできます。' },
            { q: 'QRコードはどのように配布しますか？', a: '各卓番号に対応したQRコードを印刷してテーブルに置いてください。コンビニ印刷も可能です。' },
          ].map((faq, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 'bold', fontSize: 13, color: '#7b1fa2', marginBottom: 6 }}>Q. {faq.q}</div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>A. {faq.a}</div>
            </div>
          ))}
        </div>

        <button onClick={onBack}
          style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: 'linear-gradient(90deg,#7b1fa2,#4a148c)', color: 'white', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>
          ← トップに戻る
        </button>
      </div>
    </div>
  )
}

// ── 入口（ホスト／ゲスト選択）─────────────────────────────────
function SelectGuide({ onSelectGuest, onSelectHost, onBack }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', fontFamily: 'sans-serif', paddingBottom: 60 }}>
      <div style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 17 }}>💍 使い方ガイド</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Wedding Photo</div>
        </div>
      </div>

      <div style={{ padding: '32px 16px', maxWidth: 500, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>💍</div>
          <div style={{ fontWeight: 'bold', fontSize: 20, color: '#333', marginBottom: 8 }}>あなたはどちらですか？</div>
          <div style={{ fontSize: 13, color: '#888', lineHeight: 1.7 }}>あなたに合った使い方ガイドをご案内します</div>
        </div>

        {/* ゲストカード */}
        <button onClick={onSelectGuest}
          style={{ width: '100%', padding: '24px 20px', borderRadius: 20, border: '2px solid #fce4ec', background: 'white', cursor: 'pointer', marginBottom: 16, textAlign: 'left', boxShadow: '0 4px 16px rgba(233,30,140,0.1)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#e91e8c,#f48fb1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🌸</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: 17, color: '#e91e8c', marginBottom: 4 }}>ゲストとして参加する</div>
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>招待されたゲストの方はこちら。<br />写真の投稿・閲覧・リアクションの使い方を確認できます。</div>
          </div>
          <div style={{ fontSize: 20, color: '#e91e8c' }}>›</div>
        </button>

        {/* ホストカード */}
        <button onClick={onSelectHost}
          style={{ width: '100%', padding: '24px 20px', borderRadius: 20, border: '2px solid #ede7f6', background: 'white', cursor: 'pointer', textAlign: 'left', boxShadow: '0 4px 16px rgba(156,39,176,0.1)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#7b1fa2,#9c27b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>👑</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: 17, color: '#7b1fa2', marginBottom: 4 }}>主催者として準備する</div>
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>結婚式を主催する方はこちら。<br />イベント作成からQRコード配布までの手順を確認できます。</div>
          </div>
          <div style={{ fontSize: 20, color: '#7b1fa2' }}>›</div>
        </button>
      </div>
    </div>
  )
}

// ── メインエクスポート ─────────────────────────────────────────
export default function HowToUse() {
  const router = useRouter()
  const [view, setView] = useState('select') // 'select' | 'guest' | 'host'

  // /how-to-use?role=guest でニックネーム入力画面から直接ゲストページへ飛べる
  useEffect(() => {
    const { role } = router.query
    if (role === 'guest') setView('guest')
    else if (role === 'host') setView('host')
  }, [router.query])

  const handleBack = () => {
    if (view !== 'select') {
      setView('select')
    } else {
      router.back()
    }
  }

  if (view === 'guest') return <GuestGuide onBack={handleBack} />
  if (view === 'host')  return <HostGuide  onBack={handleBack} />
  return (
    <SelectGuide
      onSelectGuest={() => setView('guest')}
      onSelectHost={() => setView('host')}
      onBack={() => router.back()}
    />
  )
}
