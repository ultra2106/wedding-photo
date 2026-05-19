export const dynamic = 'force-dynamic'

import { useRouter } from 'next/router'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wedding-photo-gamma.vercel.app'

export default function PrivacyPolicy() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', fontFamily: 'sans-serif', paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 17 }}>🔒 プライバシーポリシー</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Wedding Photo</div>
        </div>
      </div>

      <div style={{ padding: '24px 16px', maxWidth: 720, margin: '0 auto' }}>

        {/* タイトル */}
        <div style={{ background: 'white', borderRadius: 16, padding: '24px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, color: '#222' }}>プライバシーポリシー</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#aaa' }}>最終更新日：2025年1月1日</p>
          <p style={{ margin: '12px 0 0', fontSize: 14, color: '#555', lineHeight: 1.8 }}>
            Wedding Photo（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の適切な取り扱いに努めます。本ポリシーでは、本サービスが収集する情報、その利用目的、および保護措置について説明します。
          </p>
        </div>

        {[
          {
            title: '1. 収集する情報',
            content: [
              {
                subtitle: '主催者（Googleアカウントでログインする方）',
                items: [
                  'Googleアカウントのメールアドレス・氏名・プロフィール画像',
                  'Googleドライブへのアクセストークンおよびリフレッシュトークン（写真の保存に使用）',
                  'Google スプレッドシートへのアクセス権限（イベント情報の管理に使用）',
                ]
              },
              {
                subtitle: 'ゲスト（QRコードでアクセスする方）',
                items: [
                  'ニックネーム（ユーザーが任意で入力したもの）',
                  '投稿した写真・キャプション・公開設定',
                  '写真へのリアクション・掲示板への投稿内容',
                ]
              },
            ]
          },
          {
            title: '2. 情報の利用目的',
            items: [
              '結婚式イベントの作成・管理',
              '写真の主催者のGoogleドライブへの保存・表示',
              'イベント情報のGoogleスプレッドシートへの記録・管理',
              'ゲスト間の写真・リアクション・コメントの共有',
              'サービスの品質向上および不具合の修正',
            ]
          },
          {
            title: '3. 情報の第三者提供',
            text: '本サービスは、以下の場合を除き、収集した個人情報を第三者に提供・販売・貸与しません。\n・法令に基づく開示が必要な場合\n・ユーザー本人の同意がある場合\n・人の生命・身体・財産の保護に必要な場合',
          },
          {
            title: '4. Google APIの利用について',
            text: '本サービスはGoogle APIを使用しており、取得したデータはGoogleの利用規約およびプライバシーポリシーにも準拠します。取得したGoogleアカウント情報は、本サービスの機能提供のみに使用し、広告配信や目的外利用は行いません。',
            link: { label: 'Googleプライバシーポリシー', url: 'https://policies.google.com/privacy' }
          },
          {
            title: '5. データの保存と管理',
            items: [
              '写真データ：主催者のGoogleドライブに保存されます。本サービスのサーバーには写真データを保持しません。',
              'イベント情報：主催者のGoogleスプレッドシートに保存されます。',
              'リアクション・コメント：Googleスプレッドシートに保存されます。',
              'ニックネーム：ゲストのブラウザのlocalStorageに保存されます（端末外には送信されません）。',
              'アクセストークン：暗号化した上でスプレッドシートに保存されます。',
            ]
          },
          {
            title: '6. Cookieおよびローカルストレージ',
            text: '本サービスは、ログイン状態の維持のためにCookieを使用します。また、ゲストのニックネームを保持するためにブラウザのlocalStorageを使用します。ブラウザの設定によりこれらを無効にすることができますが、一部の機能が正常に動作しなくなる場合があります。',
          },
          {
            title: '7. データの削除',
            items: [
              'ゲストが投稿した写真は、本サービス上の削除ボタンから削除できます。',
              '主催者はイベントを削除することで、関連するGoogleドライブのフォルダをゴミ箱に移動できます。',
              'アカウントデータの削除をご希望の場合は、下記お問い合わせ先までご連絡ください。',
            ]
          },
          {
            title: '8. セキュリティ',
            text: '本サービスは、収集した情報を適切な技術的・組織的措置により保護します。ただし、インターネット上の通信が完全に安全であることを保証するものではありません。',
          },
          {
            title: '9. 未成年者について',
            text: '本サービスは13歳未満の方を対象としていません。13歳未満の方からの個人情報収集が判明した場合、速やかに削除いたします。',
          },
          {
            title: '10. プライバシーポリシーの変更',
            text: '本ポリシーは必要に応じて改定することがあります。重要な変更がある場合は、本サービス上でお知らせします。',
          },
          {
            title: '11. お問い合わせ',
            text: 'プライバシーに関するご質問・ご要望は、以下のURLよりお問い合わせください。',
          },
        ].map((section, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 16, padding: '20px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 16, color: '#c2185b' }}>{section.title}</h2>

            {section.text && section.text.split('\n').map((line, j) => (
              <p key={j} style={{ margin: '0 0 6px', fontSize: 14, color: '#555', lineHeight: 1.8 }}>{line}</p>
            ))}

            {section.link && (
              <a href={section.link.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: '#9c27b0', display: 'inline-block', marginTop: 6 }}>
                🔗 {section.link.label}
              </a>
            )}

            {section.items && (
              <ul style={{ margin: '0', paddingLeft: 20 }}>
                {section.items.map((item, j) => (
                  <li key={j} style={{ fontSize: 14, color: '#555', lineHeight: 1.8, marginBottom: 4 }}>{item}</li>
                ))}
              </ul>
            )}

            {section.content && section.content.map((block, j) => (
              <div key={j} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 6 }}>{block.subtitle}</div>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {block.items.map((item, k) => (
                    <li key={k} style={{ fontSize: 14, color: '#555', lineHeight: 1.8, marginBottom: 4 }}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}

        {/* フッター */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#aaa' }}>本サービスURL：</div>
          <div style={{ fontSize: 13, color: '#9c27b0', marginTop: 4 }}>{BASE_URL}</div>
        </div>

        <button onClick={() => router.push('/')}
          style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: 'linear-gradient(90deg,#e91e8c,#9c27b0)', color: 'white', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>
          💍 トップに戻る
        </button>
      </div>
    </div>
  )
}
