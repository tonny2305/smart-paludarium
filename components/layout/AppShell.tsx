'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Activity, AlertTriangle, ChevronDown, Cpu, Leaf, LogOut, Menu, Moon, Settings2, Sun, Waves, Wifi, X,
} from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { usePaludarium } from '@/providers/PaludariumProvider'
import { formatWibTime } from '@/lib/formatters'
import { getDeviceHealth } from '@/lib/paludarium'

const navItems = [
  { href: '/', label: 'Beranda', icon: Waves },
  { href: '/history', label: 'Riwayat', icon: Activity },
  { href: '/control', label: 'Kontrol', icon: Settings2 },
  { href: '/system', label: 'Sistem', icon: Cpu },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { status, browserOnline, now, dataState } = usePaludarium()
  const health = getDeviceHealth(status, now)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [lightMode, setLightMode] = useState(false)
  const [clock, setClock] = useState('')
  const [logoutError, setLogoutError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('paludarium-theme')
    setLightMode(saved ? saved === 'light' : window.matchMedia('(prefers-color-scheme: light)').matches)
  }, [])

  useEffect(() => {
    localStorage.setItem('paludarium-theme', lightMode ? 'light' : 'dark')
  }, [lightMode])

  useEffect(() => {
    const update = () => setClock(formatWibTime(Date.now()))
    update()
    const timer = window.setInterval(update, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const active = navItems.find(item => item.href === pathname)

  async function handleLogout() {
    setLogoutError('')
    try {
      await logout()
    } catch {
      setLogoutError('Tidak dapat keluar sekarang. Periksa koneksi Firebase lalu coba lagi.')
    }
  }

  function navigation(className: string) {
    return navItems.map(({ href, label, icon: Icon }) => (
      <Link
        key={href}
        href={href}
        aria-current={pathname === href ? 'page' : undefined}
        className={`${className}${pathname === href ? ' active' : ''}`}
        onClick={() => setMobileMenu(false)}
      >
        <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
        {className === 'nav-link' && pathname === href && <span className="nav-active-dot" />}
      </Link>
    ))
  }

  return (
    <div className={`app-shell${lightMode ? ' light-mode' : ''}`}>
      <aside className="sidebar">
        <div className="brand-lockup"><span className="brand-mark"><Leaf size={20} strokeWidth={1.8} /></span><span><strong>paludarium</strong><small>CONTROL CENTER</small></span></div>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Navigasi utama" className="side-nav">{navigation('nav-link')}</nav>
        <div className="sidebar-bottom">
          <div className="connection-mini"><span className={`tiny-dot ${health === 'fresh' && browserOnline ? 'green' : health === 'stale' ? 'amber' : ''}`} /><div><span className="connection-title">Perangkat</span><span className="connection-sub">{!browserOnline ? 'Browser offline' : health === 'fresh' ? 'Terhubung' : health === 'stale' ? 'Data tertunda' : health === 'offline' ? 'Offline' : 'Belum terhubung'}</span></div><ChevronDown size={14} /></div>
          <button className="user-chip" onClick={() => void handleLogout()} aria-label="Keluar dari akun"><span className="avatar">{user?.email?.[0]?.toUpperCase() || 'P'}</span><span className="user-copy"><strong>{user?.email || 'Pemilik'}</strong><small>Owner</small></span><LogOut size={15} /></button>
        </div>
      </aside>
      {mobileMenu && <button className="mobile-backdrop" aria-label="Tutup navigasi" onClick={() => setMobileMenu(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu-button icon-button" aria-label="Buka navigasi" aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)}><Menu size={19} /></button>
          <div className="breadcrumb"><span>PALUDARIUM</span><span className="breadcrumb-slash">/</span><strong>{active?.label || 'Beranda'}</strong></div>
          <div className="topbar-actions"><span className="wib-clock"><span className="clock-live-dot" /> WIB <strong>{clock}</strong></span><button className="icon-button theme-button" aria-label={lightMode ? 'Aktifkan tema gelap' : 'Aktifkan tema terang'} aria-pressed={lightMode} onClick={() => setLightMode(!lightMode)}>{lightMode ? <Moon size={17} /> : <Sun size={17} />}</button></div>
        </header>
        {logoutError && <div className="connection-error logout-error" role="alert">{logoutError}</div>}
        {dataState === 'loading' && browserOnline && <div className="data-loading" role="status">Menghubungkan telemetri Firebase…</div>}
        {!browserOnline && <div className="offline-banner" role="status"><Wifi size={15} /> Browser offline. Menampilkan telemetri terakhir; kontrol cloud dinonaktifkan.</div>}
        {status?.pump?.stop_lock && <div className="stop-banner" role="alert"><span className="stop-icon"><AlertTriangle size={17} /></span><div><strong>STOP LOCK AKTIF</strong><p>Output perangkat dikunci oleh ESP32. Hanya tindakan lokal yang dapat melepas kunci.</p></div></div>}
        <div className="page-content">{children}</div>
        <nav className="bottom-nav" aria-label="Navigasi mobile">{navigation('bottom-nav-link')}</nav>
      </main>
      {mobileMenu && <nav className="mobile-drawer" aria-label="Navigasi"><div className="mobile-drawer-head"><div className="brand-lockup"><span className="brand-mark"><Leaf size={20} /></span><span><strong>paludarium</strong><small>CONTROL CENTER</small></span></div><button className="icon-button" onClick={() => setMobileMenu(false)} aria-label="Tutup"><X size={18} /></button></div>{navigation('nav-link')}</nav>}
    </div>
  )
}
