import admin from 'firebase-admin'

// 二重初期化を防ぐ
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercelの環境変数では \n がそのまま文字列になるため置換する
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export const adminAuth = admin.auth()
export const adminDb   = admin.firestore()
