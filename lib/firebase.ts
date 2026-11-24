import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey
    && firebaseConfig.authDomain
    && firebaseConfig.databaseURL
    && firebaseConfig.projectId
    && firebaseConfig.appId,
)

export const firebaseApp = firebaseConfigured
  ? getApps().length ? getApp() : initializeApp(firebaseConfig)
  : null
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null
export const firebaseDatabase = firebaseApp ? getDatabase(firebaseApp) : null
export const deviceBasePath = (process.env.NEXT_PUBLIC_DEVICE_BASE_PATH || 'paludarium')
  .replace(/^\/+|\/+$/g, '')
export const cloudControlRequested = process.env.NEXT_PUBLIC_ENABLE_CLOUD_CONTROL === 'true'
