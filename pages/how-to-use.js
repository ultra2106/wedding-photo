export const dynamic = 'force-dynamic'

import { useRouter } from 'next/router'

const STEPS_HOST = [
  {
    icon: '🔑',
    title: 'Googleでログイン',
    desc: 'トップページから主催者としてGoogleログインします。写真はあなたのGoogleドライブに保存されます。',
  },
  {
    icon: '🎊',
    title: 'イベントを作成',
    desc: 'ダッシュボードから結婚式名・日付・卓数を設定してイベントを作成します。卓名もカスタマイズできます。',
  },
  {
    icon: '📱',
    title: 'QRコードを印刷',
    desc: '各卓用のQRコードが自動生成されます。印刷して当日各卓に設置するだけ！',
  },
  {
    icon: '⭐',
    title: 'ベスト写真を選ぶ',
    desc: '主催者アルバムからお気に入りの写真にスターを付けてベスト写真として選べます。リアクションランキングも確認できます。',
  },
]

const STEPS_GUEST = [
  {
    icon: '📷',
    title: 'QRコードをスキャン',
    desc: '卓に置いてあるQRコードをスキャンするだけ！Googleアカウント不要です。',
  },
  {
    icon: '😊',
    title: 'ニックネームを入力',
    desc: '好きなニックネームを入力して入場。次回からは自動入力されます。',
  },
  {
    icon: '🌸',
    title: '写真をアップロード',
    desc: '右上の「＋追加」から写真を投稿できます。全員公開か卓限定かを選べます。',
  },
  {
    icon: '❤️',
    title: 'リアクション＆コメント',
    desc: '写真に❤️👏😆のリアクションを押したり、掲示板でメッセージを投稿できます。',
  },
]

const FEATURES = [
  { icon: '🔒', title: '卓限定公開', desc: '自分の卓のメンバーと主催者だけに見せる写真を投稿できます' },
  { icon: '⬇️', title: '写真ダウンロード', desc: '気に入った写真を自分のスマホに保存できます' },
  { icon: '💬', title: '掲示板', desc: '二次会の場所や集合写真のお知らせなど卓ごとにメッセージを投稿できます' },
  { icon: '☁️', title: 'Googleドライブ保存', desc: '写真は主催者のGoogleドライブに自動保存。式後もずっと見られます' },
  { icon: '🏆', title: 'リアクションランキング', desc: '人気の写真をランキング表示。ベスト写真をゲストみんなで選べます' },
  { icon: '🔄', title: '自動更新', desc: '30秒ごとに自動更新。誰かが投稿したらすぐ表示されます' },
]

export default function HowToUse() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', fontFamily: 'sans-serif', paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 17 }}>💍 Wedding Photo</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>使い方ガイド</div>
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

        {/* ヒーロー */}
        <div style={{ background: 'linear-gradient(135deg,#e91e8c,#9c27b0)', borderRadius: 20, padding: '24px 20px', marginBottom: 24, textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💍</div>
          <div style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 6 }}>Wedding Photo</div>
          <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6 }}>
            結婚式の思い出を卓ごとにシェアできる<br />写真共有アプリです
          </div>
        </div>

        {/* 主催者向け */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', fontSize: 12, fontWeight: 'bold', padding: '4px 12px', borderRadius: 20 }}>👑 主催者の方へ</span>
          </div>
          {STEPS_HOST.map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#fff0f6,#f3e8ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ background: '#e91e8c', color: 'white', fontSize: 11, fontWeight: 'bold', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i+1}</span>
                  <span style={{ fontWeight: 'bold', fontSize: 15, color: '#222' }}>{s.title}</span>
                </div>
                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ゲスト向け */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ background: '#f0f0f0', color: '#555', fontSize: 12, fontWeight: 'bold', padding: '4px 12px', borderRadius: 20 }}>🌸 ゲストの方へ</span>
          </div>
          {STEPS_GUEST.map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#f3e8ff,#e8f5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ background: '#9c27b0', color: 'white', fontSize: 11, fontWeight: 'bold', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i+1}</span>
                  <span style={{ fontWeight: 'bold', fontSize: 15, color: '#222' }}>{s.title}</span>
                </div>
                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 機能一覧 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 'bold', fontSize: 15, color: '#333', marginBottom: 14 }}>✨ 主な機能</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 14, padding: '14px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
                <div style={{ fontWeight: 'bold', fontSize: 13, color: '#333', marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 'bold', fontSize: 15, color: '#333', marginBottom: 14 }}>❓ よくある質問</div>
          {[
            { q: 'Googleアカウントは必要ですか？', a: '主催者のみGoogleアカウントが必要です。ゲストはニックネームだけで参加できます。' },
            { q: '写真はどこに保存されますか？', a: '主催者のGoogleドライブに自動保存されます。式後もいつでも見られます。' },
            { q: '卓限定公開とは何ですか？', a: 'その卓のメンバーと主催者のみが見られる写真です。全員公開にすると全ゲストが見られます。' },
            { q: '写真を間違えて投稿した場合は？', a: '自分が投稿した写真は写真左下の×ボタンで削除できます。' },
            { q: '何枚まで投稿できますか？', a: 'Googleドライブの容量の範囲内で制限はありません。' },
          ].map((faq, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 'bold', fontSize: 13, color: '#e91e8c', marginBottom: 6 }}>Q. {faq.q}</div>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>A. {faq.a}</div>
            </div>
          ))}
        </div>

        {/* CTAボタン */}
        <button onClick={() => router.push('/')}
          style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>
          💍 はじめる
        </button>
      </div>
    </div>
  )
}
