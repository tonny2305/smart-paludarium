'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { signOut } from 'firebase/auth'
import { limitToLast, onValue, orderByKey, query, ref } from 'firebase/database'
import { deviceBasePath, firebaseAuth, firebaseDatabase } from '@/lib/firebase'
import {
  normalizeEvents,
  normalizeSettings,
  normalizeStatus,
  type PaludariumEvent,
  type PaludariumSettings,
  type PaludariumStatus,
} from '@/lib/paludarium'

export type DataState = 'loading' | 'ready' | 'error'

interface PaludariumContextValue {
  status: PaludariumStatus | null
  settings: PaludariumSettings | null
  events: PaludariumEvent[]
  dataState: DataState
  error: string | null
  browserOnline: boolean
  now: number
}

const PaludariumContext = createContext<PaludariumContextValue | null>(null)

export function PaludariumProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<PaludariumStatus | null>(null)
  const [settings, setSettings] = useState<PaludariumSettings | null>(null)
  const [events, setEvents] = useState<PaludariumEvent[]>([])
  const [dataState, setDataState] = useState<DataState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [browserOnline, setBrowserOnline] = useState(true)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    setBrowserOnline(navigator.onLine)
    const update = () => setBrowserOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!firebaseDatabase) {
      setStatus(null)
      setSettings(null)
      setEvents([])
      setError('Firebase belum dikonfigurasi. Isi variabel Firebase di .env.local.')
      setDataState('error')
      return
    }

    setStatus(null)
    setSettings(null)
    setEvents([])
    setError(null)
    setDataState('loading')
    let statusLoaded = false
    let settingsLoaded = false
    let eventsLoaded = false
    let hasError = false
    const updateReady = () => {
      if (!hasError && statusLoaded && settingsLoaded && eventsLoaded) setDataState('ready')
    }
    const reportError = (reason: Error) => {
      hasError = true
      const code = 'code' in reason ? String(reason.code) : ''
      const expired = /expired|unauthenticated/i.test(`${code} ${reason.message}`)
      setError(expired
        ? 'Sesi Firebase berakhir. Silakan masuk kembali.'
        : /permission_denied|permission/i.test(`${code} ${reason.message}`)
          ? 'Firebase Rules tidak mengizinkan akses untuk akun ini.'
          : 'Tidak dapat membaca Realtime Database. Periksa koneksi Firebase.')
      setDataState('error')
      if (expired && firebaseAuth) {
        void signOut(firebaseAuth).catch(() => setError('Sesi berakhir dan tidak dapat ditutup otomatis. Muat ulang halaman untuk masuk kembali.'))
      }
    }

    const stopStatus = onValue(ref(firebaseDatabase, `${deviceBasePath}/status`), snapshot => {
      setStatus(normalizeStatus(snapshot.val()))
      statusLoaded = true
      updateReady()
    }, reportError)
    const stopSettings = onValue(ref(firebaseDatabase, `${deviceBasePath}/settings`), snapshot => {
      setSettings(normalizeSettings(snapshot.val()))
      settingsLoaded = true
      updateReady()
    }, reportError)
    const stopEvents = onValue(
      query(ref(firebaseDatabase, `${deviceBasePath}/events`), orderByKey(), limitToLast(50)),
      snapshot => {
        setEvents(normalizeEvents(snapshot.val()))
        eventsLoaded = true
        updateReady()
      },
      reportError,
    )

    return () => {
      stopStatus()
      stopSettings()
      stopEvents()
    }
  }, [])

  const value = useMemo(() => ({
    status,
    settings,
    events,
    dataState,
    error,
    browserOnline,
    now,
  }), [status, settings, events, dataState, error, browserOnline, now])

  return <PaludariumContext.Provider value={value}>{children}</PaludariumContext.Provider>
}

export function usePaludarium(): PaludariumContextValue {
  const value = useContext(PaludariumContext)
  if (!value) throw new Error('usePaludarium harus digunakan di dalam PaludariumProvider')
  return value
}
