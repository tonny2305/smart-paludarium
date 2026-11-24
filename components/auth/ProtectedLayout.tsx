'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { SetupScreen } from '@/components/auth/SetupScreen'
import { useAuth } from '@/providers/AuthProvider'
import { firebaseConfigured } from '@/lib/firebase'
import { PaludariumProvider } from '@/providers/PaludariumProvider'

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && firebaseConfigured && !user) router.replace('/login')
  }, [loading, user, router])

  if (!firebaseConfigured) return <SetupScreen />
  if (loading || !user) {
    return <main className="auth-loading" role="status"><span className="brand-mark"><LoaderCircle className="spin" size={19} /></span><span>Menyiapkan koneksi aman…</span></main>
  }

  return <PaludariumProvider><AppShell>{children}</AppShell></PaludariumProvider>
}
