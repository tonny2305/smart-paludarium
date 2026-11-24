import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

export interface PaludariumStatus {
  device?: string
  firmware?: string
  online?: boolean
  clock?: { rtc_ready?: boolean; ntp_synced?: boolean; text?: string; date_key?: number }
  network?: { rssi_dbm?: number; local_ip?: string }
  fan?: { on?: boolean; mode?: string; start_hour?: number; end_hour?: number }
  pump?: { on?: boolean; mode?: string; manual_hold?: boolean; manual_timer_seconds?: number; auto_hour?: number; auto_minute?: number; auto_seconds?: number; daily_seconds?: number; daily_runs?: number; stop_lock?: boolean }
  weather?: { fresh?: boolean; description?: string; temperature_c?: number | null; humidity_percent?: number | null; rain_probability_percent?: number | null; forecast_time?: string }
  dht22?: { gpio?: number; available?: boolean; history_interval_minutes?: number; temperature_c?: number | null; humidity_percent?: number | null }
  firebase?: { event_queue?: number; last_dht_history?: string }
  system?: { free_heap?: number; uptime_seconds?: number; firebase_transport?: string }
}

export interface PaludariumSettings {
  firmware?: string
  fan?: { mode?: string; auto_start_hour?: number; auto_end_hour?: number }
  pump?: { mode?: string; manual_timer_seconds?: number; auto_hour?: number; auto_minute?: number; auto_seconds?: number; manual_hold_failsafe_seconds?: number; float_installed?: boolean; allow_auto_without_float?: boolean }
  dht22?: { gpio?: number; history_interval_minutes?: number }
  weather?: { provider?: string; timezone?: string }
}

export interface PaludariumEvent {
  type?: string
  action?: string
  detail?: string
  time?: string
  firmware?: string
  uptime_seconds?: number
  epoch_local_basis?: number
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean)
export const firebaseApp = firebaseConfigured
  ? getApps().length ? getApp() : initializeApp(firebaseConfig)
  : null
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null
export const firebaseDatabase = firebaseApp ? getDatabase(firebaseApp) : null
export const deviceBasePath = process.env.NEXT_PUBLIC_DEVICE_BASE_PATH || 'paludarium'

export type DeviceHealth = 'fresh' | 'stale' | 'offline' | 'unknown'

export function getDeviceTimestamp(status: PaludariumStatus | null): number | null {
  const dateKey = status?.clock?.date_key
  const clockText = status?.clock?.text
  if (!dateKey || !clockText) return null
  const date = String(dateKey)
  const match = clockText.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})/)
  if (!match || date.length !== 8) return null
  const [, , , hour, minute, second] = match
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(4, 6))
  const day = Number(date.slice(6, 8))
  const wallClock = Date.UTC(year, month - 1, day, Number(hour), Number(minute), Number(second))
  const timestamp = wallClock - 7 * 60 * 60 * 1000
  return Number.isFinite(timestamp) ? timestamp : null
}

export function getDeviceHealth(status: PaludariumStatus | null, now = Date.now()): DeviceHealth {
  const timestamp = getDeviceTimestamp(status)
  if (timestamp === null) return 'unknown'
  const ageSeconds = (now - timestamp) / 1000
  if (ageSeconds < -90) return 'unknown'
  if (ageSeconds <= 90) return 'fresh'
  if (ageSeconds <= 300) return 'stale'
  return 'offline'
}

export function formatRelativeUpdate(status: PaludariumStatus | null, now = Date.now()): string {
  const timestamp = getDeviceTimestamp(status)
  if (timestamp === null) return 'Waktu perangkat belum tersedia'
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (seconds < 60) return `Diperbarui ${seconds} dtk lalu`
  if (seconds < 3600) return `Diperbarui ${Math.floor(seconds / 60)} mnt lalu`
  return `Diperbarui ${Math.floor(seconds / 3600)} jam lalu`
}
