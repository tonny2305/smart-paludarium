'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { firebaseConfigured } from '@/lib/firebase'

export function ControlAccess({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && firebaseConfigured && !user) router.replace('/login')
  }, [loading, user, router])

  if (!firebaseConfigured) {
    return <section className="panel control-setup-message"><h2>Firebase belum dikonfigurasi</h2><p>Isi variabel Firebase di .env.local sebelum menggunakan kontrol perangkat.</p></section>
  }
  if (loading || !user) {
    return <main className="auth-loading" role="status"><span className="brand-mark"><LoaderCircle className="spin" size={19} /></span><span>Menyiapkan akses kontrol…</span></main>
  }

  return children
}
