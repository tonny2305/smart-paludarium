'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'
import { SetupScreen } from '@/components/auth/SetupScreen'
import { useAuth } from '@/providers/AuthProvider'
import { firebaseConfigured } from '@/lib/firebase'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) router.replace('/control')
  }, [loading, user, router])

  if (!firebaseConfigured) return <SetupScreen />
  if (loading || user) return <main className="auth-loading" role="status">Menyiapkan akses kontrol…</main>
  return <LoginForm />
}
