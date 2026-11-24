'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, Leaf, LoaderCircle, LockKeyhole } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email.trim(), password)
      router.replace('/')
    } catch (reason) {
      const code = typeof reason === 'object' && reason !== null && 'code' in reason
        ? String(reason.code)
        : ''
      setError(code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password'
        ? 'Email atau kata sandi tidak sesuai.'
        : code === 'auth/too-many-requests'
          ? 'Terlalu banyak percobaan. Coba lagi nanti.'
          : 'Tidak dapat masuk. Periksa koneksi dan konfigurasi Firebase.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-screen">
      <div className="login-art" aria-hidden="true"><div className="login-orb" /><div className="login-hill hill-one" /><div className="login-hill hill-two" /><div className="login-leaf leaf-a" /><div className="login-leaf leaf-b" /><div className="login-leaf leaf-c" /><span className="login-art-caption">A LIVING WORLD, IN BALANCE</span></div>
      <div className="login-side">
        <div className="brand-lockup"><span className="brand-mark"><Leaf size={20} /></span><span><strong>paludarium</strong><small>CONTROL CENTER</small></span></div>
        <div className="login-form-wrap">
          <span className="eyebrow">PRIVATE ACCESS</span><h1>Selamat datang.</h1><p>Masuk untuk memantau ekosistem paludarium Anda.</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="nama@email.com" />
            <label htmlFor="password">Kata sandi</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Masukkan kata sandi" />
            {error && <div className="login-error" role="alert"><AlertTriangle size={14} />{error}</div>}
            <button className="login-submit" type="submit" disabled={busy}>
              {busy ? <><LoaderCircle size={16} className="spin" /> Memeriksa…</> : <>Masuk dengan aman <ArrowRight size={16} /></>}
            </button>
          </form>
          <div className="login-security"><LockKeyhole size={14} /><span>Akun dibuat oleh pemilik Firebase. Pendaftaran publik tidak tersedia.</span></div>
        </div>
        <span className="login-copyright">SMART PALUDARIUM <b>·</b> ASIA/JAKARTA</span>
      </div>
    </main>
  )
}
