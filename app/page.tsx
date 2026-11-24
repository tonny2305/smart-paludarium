'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, Check, ChevronDown, CircleHelp,
  Cloud, CloudRain, Cpu, Droplets, Fan, Leaf, LoaderCircle, LockKeyhole, LogOut,
  Menu, Moon, RefreshCw, Settings2, ShieldCheck, Sun, Thermometer, Waves, Wind,
  Wifi, X,
} from 'lucide-react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { limitToLast, onValue, query, ref } from 'firebase/database'
import {
  deviceBasePath, firebaseAuth, firebaseConfigured, firebaseDatabase,
  formatRelativeUpdate, getDeviceHealth,
  type PaludariumEvent, type PaludariumSettings, type PaludariumStatus,
} from '@/lib/paludarium'

type Section = 'home' | 'history' | 'control' | 'system'
type DataState = 'loading' | 'ready' | 'empty' | 'error'

const navItems: { id: Section; label: string; icon: typeof Activity }[] = [
  { id: 'home', label: 'Beranda', icon: Waves },
  { id: 'history', label: 'Riwayat', icon: Activity },
  { id: 'control', label: 'Kontrol', icon: Settings2 },
  { id: 'system', label: 'Sistem', icon: Cpu },
]

function shortTime(value?: string) {
  if (!value) return '—'
  const match = value.match(/(\d{2}:\d{2})(?::\d{2})?\s*WIB?/i)
  return match?.[1] ?? value
}

function describeEvent(event: PaludariumEvent) {
  const type = event.type?.toLowerCase()
  const action = event.action?.toUpperCase()
  if (type === 'pump') return action === 'ON' ? 'Pompa mulai bekerja' : action === 'OFF' || action === 'STOP' ? 'Pompa berhenti' : 'Mode pompa berubah'
  if (type === 'fan') return action === 'ON' ? 'Kipas menyala' : action === 'OFF' ? 'Kipas berhenti' : 'Mode kipas berubah'
  if (type === 'system') return action === 'BOOT' ? 'ESP32 dinyalakan' : 'Pembaruan sistem'
  return `${event.type || 'Aktivitas'} · ${event.action || 'Perubahan'}`
}

function AppFrame({ section, setSection, children, user, onLogout, onlineLabel }: {
  section: Section; setSection: (value: Section) => void; children: React.ReactNode
  user: User; onLogout: () => void; onlineLabel: string
}) {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [lightMode, setLightMode] = useState(false)
  return (
    <div className={`app-shell${lightMode ? ' light-mode' : ''}`}>
      <aside className="sidebar">
        <div className="brand-lockup"><span className="brand-mark"><Leaf size={20} strokeWidth={1.8} /></span><span><strong>paludarium</strong><small>CONTROL CENTER</small></span></div>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Navigasi utama" className="side-nav">
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link${section === id ? ' active' : ''}`} onClick={() => { setSection(id); setMobileMenu(false) }}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{section === id && <span className="nav-active-dot" />}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-mini"><span className={`tiny-dot ${onlineLabel === 'ONLINE' ? 'green' : onlineLabel === 'STALE' ? 'amber' : ''}`} /><div><span className="connection-title">Perangkat</span><span className="connection-sub">{onlineLabel === 'ONLINE' ? 'Terhubung' : onlineLabel === 'STALE' ? 'Data tertunda' : 'Belum terhubung'}</span></div><ChevronDown size={14} /></div>
          <button className="user-chip" onClick={onLogout} aria-label="Keluar dari akun"><span className="avatar">{user.email?.[0]?.toUpperCase() || 'P'}</span><span className="user-copy"><strong>{user.email || 'Pemilik'}</strong><small>Owner</small></span><LogOut size={15} /></button>
        </div>
      </aside>
      {mobileMenu && <button className="mobile-backdrop" aria-label="Tutup navigasi" onClick={() => setMobileMenu(false)} />}
      <main className="main-area">
        <header className="topbar"><button className="mobile-menu-button icon-button" aria-label="Buka navigasi" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={19} /></button><div className="breadcrumb"><span>PALUDARIUM</span><span className="breadcrumb-slash">/</span><strong>{navItems.find(item => item.id === section)?.label}</strong></div><div className="topbar-actions"><span className="wib-clock"><span className="clock-live-dot" /> WIB <strong>{new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())}</strong></span><button className="icon-button theme-button" aria-label={lightMode ? 'Aktifkan tema gelap' : 'Aktifkan tema terang'} onClick={() => setLightMode(!lightMode)}>{lightMode ? <Moon size={17} /> : <Sun size={17} />}</button></div></header>
        <div className="page-content">{children}</div>
        <nav className="bottom-nav" aria-label="Navigasi mobile">{navItems.map(({ id, label, icon: Icon }) => <button key={id} aria-current={section === id ? 'page' : undefined} className={`bottom-nav-link${section === id ? ' active' : ''}`} onClick={() => setSection(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>
      </main>
      {mobileMenu && <nav className="mobile-drawer" aria-label="Navigasi"><div className="mobile-drawer-head"><div className="brand-lockup"><span className="brand-mark"><Leaf size={20} /></span><span><strong>paludarium</strong><small>CONTROL CENTER</small></span></div><button className="icon-button" onClick={() => setMobileMenu(false)} aria-label="Tutup"><X size={18} /></button></div>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link${section === id ? ' active' : ''}`} onClick={() => { setSection(id); setMobileMenu(false) }}><Icon size={18} />{label}</button>)}</nav>}
    </div>
  )
}

function PageHeading({ eyebrow, title, detail, trailing }: { eyebrow: string; title: string; detail: string; trailing?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{detail}</p></div>{trailing}</div>
}

function SensorCard({ title, icon: Icon, value, unit, secondary, status, tone, children }: {
  title: string; icon: typeof Activity; value: string; unit?: string; secondary?: string; status: string; tone: string; children?: React.ReactNode
}) {
  return <article className={`sensor-card ${tone}`}><div className="card-top"><span className="icon-tile"><Icon size={17} /></span><span className="card-kicker">{title}</span><span className="card-status"><span className="status-dot" />{status}</span></div><div className="sensor-reading">{value}{unit && <span className="sensor-unit">{unit}</span>}</div>{secondary && <div className="sensor-secondary">{secondary}</div>}{children}</article>
}

function DeviceStatus({ status, events }: { status: PaludariumStatus | null; events: PaludariumEvent[] }) {
  const health = getDeviceHealth(status)
  const healthLabel = { fresh: 'ONLINE', stale: 'STALE', offline: 'OFFLINE', unknown: 'UNKNOWN' }[health]
  const healthCopy = { fresh: 'Telemetri perangkat terbaru', stale: 'Pembaruan perangkat tertunda', offline: 'Tidak ada pembaruan terbaru', unknown: 'Waktu perangkat belum tersedia' }[health]
  const pumpOn = status?.pump?.on === true
  const fanOn = status?.fan?.on === true
  const indoorAvailable = status?.dht22?.available === true && status?.dht22?.temperature_c != null
  const weatherAvailable = status?.weather?.temperature_c != null
  return <>
    {status?.pump?.stop_lock && <div className="stop-banner"><span className="stop-icon"><AlertTriangle size={17} /></span><div><strong>STOP LOCK AKTIF</strong><p>Output kipas dan pompa dikunci oleh ESP32. Pelepasan memerlukan tindakan lokal/serial.</p></div></div>}
    <PageHeading eyebrow="OVERVIEW · EKOSISTEM RUMAH" title="Selamat datang kembali" detail="Kondisi paludarium Anda, sekilas." trailing={<div className={`health-pill ${health}`}><span className="health-pulse" />{healthLabel}<span className="health-divider" />{formatRelativeUpdate(status)}</div>} />
    <section className="hero-card"><div className="hero-copy"><div className="hero-label"><span className={`hero-online-dot ${health}`} />KONDISI PALUDARIUM <span className={`hero-state ${health}`}>{healthLabel}</span></div><h2>Sebuah ekosistem kecil,<br /><span>terjaga dengan baik.</span></h2><p>{healthCopy}. {status?.device ? `Perangkat ${status.device}` : 'Menunggu telemetri pertama dari perangkat Anda.'}</p><div className="hero-facts"><span><Wind size={15} />Kipas <b>{status?.fan?.on === undefined ? '—' : fanOn ? 'Menyala' : 'Mati'}</b></span><i /><span><Droplets size={15} />Pompa <b>{status?.pump?.on === undefined ? '—' : pumpOn ? 'Berjalan' : 'Siaga'}</b></span></div></div><div className="habitat-art" aria-hidden="true"><div className="habitat-glow" /><div className="habitat-moon" /><div className="habitat-mountain mountain-back" /><div className="habitat-mountain mountain-front" /><div className="habitat-water" /><div className="plant plant-one"><i /><i /><i /><i /><b /></div><div className="plant plant-two"><i /><i /><i /><i /><b /></div><div className="plant plant-three"><i /><i /><i /><b /></div><div className="art-grain" /></div><span className="hero-meta">ESP32 <span>·</span> FIRMWARE {status?.firmware || '—'}</span></section>
    <div className="section-title-row"><div><span className="eyebrow">LINGKUNGAN</span><h2>Kondisi saat ini</h2></div><span className="section-aside"><RefreshCw size={12} /> Sinkronisasi real-time</span></div>
    <section className="metrics-grid" aria-label="Metrik lingkungan">
      <SensorCard title="SUHU DALAM" icon={Thermometer} value={indoorAvailable && status?.dht22?.temperature_c != null ? status.dht22.temperature_c.toFixed(1) : '—'} unit={indoorAvailable ? '°C' : undefined} secondary={indoorAvailable && status?.dht22?.humidity_percent != null ? `Kelembapan ${Math.round(status.dht22.humidity_percent)}%` : 'SENSOR DHT22'} status={indoorAvailable ? 'Aktif' : 'Belum aktif'} tone="temperature"><div className="sensor-footnote">{indoorAvailable ? 'Sensor dalam ruang' : `GPIO ${status?.dht22?.gpio ?? 32} · Menunggu sensor terhubung`}</div></SensorCard>
      <SensorCard title="CUACA LUAR" icon={Cloud} value={weatherAvailable ? `${status?.weather?.temperature_c?.toFixed(1)}` : '—'} unit={weatherAvailable ? '°C' : undefined} secondary={weatherAvailable ? `${status?.weather?.description || 'Kondisi luar'}${status?.weather?.humidity_percent != null ? ` · RH ${Math.round(status.weather.humidity_percent)}%` : ''}` : 'PRAKIRAAN OPEN-METEO'} status={weatherAvailable ? status?.weather?.fresh ? 'Terkini' : 'Tertunda' : 'Belum tersedia'} tone="weather"><div className="sensor-footnote">{status?.weather?.rain_probability_percent != null ? <><CloudRain size={13} /> Hujan {status.weather.rain_probability_percent}%</> : 'Prakiraan luar · Asia/Jakarta'}</div></SensorCard>
      <SensorCard title="KIPAS SIRKULASI" icon={Fan} value={status?.fan?.on === undefined ? '—' : fanOn ? 'ON' : 'OFF'} secondary={status?.fan?.mode ? `MODE ${status.fan.mode}` : 'STATUS BELUM TERSEDIA'} status={status?.fan?.mode || 'Menunggu data'} tone="fan"><div className="sensor-footnote">Jadwal {status?.fan?.start_hour != null && status?.fan?.end_hour != null ? `${String(status.fan.start_hour).padStart(2, '0')}:00 – ${String(status.fan.end_hour).padStart(2, '0')}:00` : '—'}</div></SensorCard>
      <SensorCard title="POMPA PENGISIAN" icon={Droplets} value={status?.pump?.on === undefined ? '—' : pumpOn ? 'ON' : 'OFF'} secondary={status?.pump?.mode ? `MODE ${status.pump.mode}` : 'STATUS BELUM TERSEDIA'} status={status?.pump?.stop_lock ? 'STOP LOCK' : pumpOn ? 'Sedang berjalan' : 'Siaga'} tone={pumpOn ? 'pump running' : 'pump'}><div className="sensor-footnote">Jadwal otomatis {status?.pump?.auto_hour != null ? `${String(status.pump.auto_hour).padStart(2, '0')}:${String(status.pump.auto_minute ?? 0).padStart(2, '0')} WIB` : '—'} · {status?.pump?.auto_seconds ?? '—'} dtk</div></SensorCard>
    </section>
    <section className="home-lower"><article className="panel trend-panel"><div className="panel-heading"><div><span className="eyebrow">SENSOR DALAM · DHT22</span><h2>Tren 24 jam</h2></div><button className="text-link" onClick={() => window.dispatchEvent(new CustomEvent('paludarium:navigate', { detail: 'history' }))}>Riwayat lengkap <ArrowRight size={14} /></button></div><div className="chart-empty"><div className="chart-empty-icon"><Activity size={18} /></div><div><strong>Belum ada riwayat sensor</strong><p>Data per jam akan tampil di sini setelah DHT22 terhubung.</p></div><span className="sample-note">1 sampel / jam</span></div><div className="chart-baseline"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>SEKARANG</span></div></article>
      <article className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">LOG PERANGKAT</span><h2>Aktivitas terbaru</h2></div><span className="live-label"><span className="live-indicator" />LIVE</span></div>{events.length ? <div className="event-list">{events.slice(0, 4).map((event, index) => <EventRow key={`${event.time}-${index}`} event={event} />)}</div> : <div className="activity-empty"><div className="empty-ring"><Activity size={18} /></div><strong>Belum ada aktivitas</strong><span>Event dari ESP32 akan tercatat di sini.</span></div>}</article></section>
    <footer className="page-footer"><span><ShieldCheck size={14} /> Otomasi lokal ESP32 tetap berjalan tanpa koneksi cloud.</span><span>ASIA/JAKARTA <b>·</b> WIB</span></footer>
  </>
}

function EventRow({ event }: { event: PaludariumEvent }) {
  const type = event.type?.toLowerCase()
  const Icon = type === 'fan' ? Fan : type === 'pump' ? Droplets : type === 'system' ? Cpu : Activity
  return <div className="event-row"><span className={`event-icon ${type || 'system'}`}><Icon size={15} /></span><div className="event-copy"><strong>{describeEvent(event)}</strong><span>{event.detail || `Firmware ${event.firmware || '—'}`}</span></div><time>{shortTime(event.time)}</time></div>
}

function HistoryPage({ status }: { status: PaludariumStatus | null }) {
  const [range, setRange] = useState('24J')
  return <><PageHeading eyebrow="LINGKUNGAN · TREN" title="Riwayat sensor" detail="Suhu dan kelembapan dalam paludarium, dicatat setiap jam." trailing={<span className="data-source"><Thermometer size={14} /> DHT22 · GPIO {status?.dht22?.gpio ?? 32}</span>} /><div className="history-summary"><div className="panel"><div className="summary-label"><Thermometer size={15} /> SUHU SAAT INI</div><strong>{status?.dht22?.temperature_c != null && status.dht22.available ? `${status.dht22.temperature_c.toFixed(1)}°` : '—'}</strong><span>°C · Dalam ruang</span></div><div className="panel"><div className="summary-label blue"><Droplets size={15} /> KELEMBAPAN</div><strong>{status?.dht22?.humidity_percent != null && status.dht22.available ? `${Math.round(status.dht22.humidity_percent)}%` : '—'}</strong><span>RH · Dalam ruang</span></div><div className="history-range">{['24J', '7H', '30H'].map(item => <button key={item} onClick={() => setRange(item)} className={range === item ? 'selected' : ''}>{item}</button>)}</div></div><div className="panel history-chart-panel"><div className="panel-heading"><div><span className="eyebrow">DHT22 · {range === '24J' ? '24 JAM TERAKHIR' : range === '7H' ? '7 HARI TERAKHIR' : '30 HARI TERAKHIR'}</span><h2>Perubahan lingkungan</h2></div><span className="chart-legend"><span className="legend-temp" />Suhu <span className="legend-humidity" />Kelembapan</span></div><div className="history-empty"><div className="empty-orbit"><Thermometer size={23} /><span><Droplets size={13} /></span></div><strong>Belum ada data historis</strong><p>Riwayat dimulai otomatis setelah sensor DHT22 tersedia dan mengirim pembacaan per jam.</p><div className="history-empty-meta"><span>FREKUENSI <b>1× / JAM</b></span><span>SUMBER <b>ESP32 · Firebase</b></span></div></div><div className="chart-baseline"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>SEKARANG</span></div></div><div className="info-strip"><CircleHelp size={16} /><span>Data suhu dalam ruang berasal dari DHT22. Prakiraan cuaca luar ditampilkan terpisah di beranda.</span></div></>
}

function ControlPage({ status }: { status: PaludariumStatus | null }) {
  return <><PageHeading eyebrow="PERANGKAT · OTOMASI" title="Kontrol perangkat" detail="Pantau mode dan jadwal. Otomasi lokal tetap menjadi kendali utama." /><div className="control-disabled-banner"><span className="control-lock"><LockKeyhole size={17} /></span><div><strong>Kontrol cloud belum diaktifkan</strong><p>Firmware ESP32 V{status?.firmware || '6.1'} belum mendengarkan perintah cloud. Monitoring tetap aktif; kendali lokal tersedia di dashboard ESP32.</p></div><span className="version-tag">FIRMWARE 6.1</span></div><div className="control-grid"><article className="panel control-card"><div className="control-card-top"><span className="icon-tile"><Fan size={18} /></span><span className="mode-tag">{status?.fan?.mode || '—'}</span></div><span className="eyebrow">SIRKULASI UDARA</span><h2>Fan Control</h2><div className="control-current"><span>Status saat ini</span><strong className={status?.fan?.on ? 'state-on' : ''}><span className="status-dot" />{status?.fan?.on === undefined ? 'Belum diketahui' : status.fan.on ? 'ON · ' + (status.fan.mode || 'AUTO') : 'OFF · ' + (status.fan.mode || 'AUTO')}</strong></div><div className="schedule-display"><span>Jadwal otomatis</span><strong>{status?.fan?.start_hour != null && status.fan.end_hour != null ? `${String(status.fan.start_hour).padStart(2, '0')}:00 → ${String(status.fan.end_hour).padStart(2, '0')}:00` : 'Belum tersedia'}</strong></div><button className="disabled-control" disabled><LockKeyhole size={14} /> Kontrol tersedia di firmware mendatang</button></article><article className={`panel control-card pump-control-card${status?.pump?.on ? ' active-pump' : ''}`}><div className="control-card-top"><span className="icon-tile blue-tile"><Droplets size={18} /></span><span className="mode-tag">{status?.pump?.mode || '—'}</span></div><span className="eyebrow">PENGISIAN AIR</span><h2>Refill Pump</h2><div className="control-current"><span>Status saat ini</span><strong className={status?.pump?.on ? 'state-on' : ''}><span className="status-dot" />{status?.pump?.on === undefined ? 'Belum diketahui' : status.pump.on ? 'POMPA BERJALAN' : 'OFF · SIAGA'}</strong></div><div className="schedule-display"><span>Jadwal AUTO</span><strong>{status?.pump?.auto_hour != null ? `${String(status.pump.auto_hour).padStart(2, '0')}:${String(status.pump.auto_minute ?? 0).padStart(2, '0')} WIB · ${status.pump.auto_seconds ?? '—'} dtk` : 'Belum tersedia'}</strong></div><button className="disabled-control" disabled><LockKeyhole size={14} /> Kontrol tersedia di firmware mendatang</button></article></div><div className="safety-note"><span className="safety-icon"><AlertTriangle size={15} /></span><p><strong>Pengisian air memerlukan pengawasan.</strong> Sensor ketinggian air belum terpasang. Kontrol langsung akan memerlukan konfirmasi eksplisit dan status perangkat terbaru.</p></div><div className="local-control-card"><span className="local-icon"><Wifi size={17} /></span><div><strong>Perlu mengubah perangkat?</strong><span>Gunakan dashboard lokal ESP32 di jaringan Wi-Fi yang sama.</span></div><ArrowDownRight size={16} /></div></>
}

function SystemPage({ status, settings, events, dataState, user }: { status: PaludariumStatus | null; settings: PaludariumSettings | null; events: PaludariumEvent[]; dataState: DataState; user: User }) {
  const [showJson, setShowJson] = useState(false)
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState('Semua')
  const [diagnosticError, setDiagnosticError] = useState('')
  const health = getDeviceHealth(status)
  const filteredEvents = events.filter(event => filter === 'Semua' || event.type?.toLowerCase() === filter.toLowerCase())
  const diagnostics = JSON.stringify({ status, settings }, null, 2)
  async function copyDiagnostics() {
    try { await navigator.clipboard.writeText(diagnostics); setCopied(true); setDiagnosticError(''); window.setTimeout(() => setCopied(false), 1800) }
    catch { setDiagnosticError('Clipboard tidak tersedia di browser ini.') }
  }
  const uptime = status?.system?.uptime_seconds
  const uptimeText = uptime == null ? '—' : `${Math.floor(uptime / 3600)}j ${Math.floor((uptime % 3600) / 60)}m`
  const rssi = status?.network?.rssi_dbm
  const signal = rssi == null ? '—' : rssi >= -50 ? 'Sangat baik' : rssi >= -60 ? 'Baik' : rssi >= -70 ? 'Cukup' : 'Lemah'
  return <><PageHeading eyebrow="DIAGNOSTIK · PERANGKAT" title="Sistem & aktivitas" detail="Kesehatan perangkat, koneksi, dan catatan operasional." trailing={<span className={`health-pill ${health}`}><span className="health-pulse" />{health.toUpperCase()}</span>} /><section className="system-overview"><article className="panel device-card"><div className="device-orb"><Cpu size={24} /></div><div><span className="eyebrow">PERANGKAT</span><h2>{status?.device || 'Smart Paludarium'}</h2><p>ESP32 WROOM-32 <span>·</span> Firmware {status?.firmware || '—'}</p></div><div className="device-health"><span className={`tiny-dot ${health === 'fresh' ? 'green' : health === 'stale' ? 'amber' : ''}`} />{health === 'fresh' ? 'Terhubung' : health === 'unknown' ? 'Menunggu data' : health === 'stale' ? 'Data tertunda' : 'Offline'}</div></article><article className="panel uptime-card"><span className="summary-label"><Activity size={14} /> UPTIME</span><strong>{uptimeText}</strong><span>Sejak perangkat terakhir menyala</span></article></section><section className="system-details"><div className="panel details-panel"><div className="panel-heading"><div><span className="eyebrow">KONEKTIVITAS</span><h2>Informasi perangkat</h2></div><span className="mini-badge"><Wifi size={12} /> ESP32</span></div><div className="details-list"><DetailRow label="Waktu perangkat" value={status?.clock?.text || 'Belum tersedia'} /><DetailRow label="RTC" value={status?.clock?.rtc_ready === undefined ? '—' : status.clock.rtc_ready ? 'Siap' : 'Tidak siap'} /><DetailRow label="Sinkronisasi NTP" value={status?.clock?.ntp_synced === undefined ? '—' : status.clock.ntp_synced ? 'Tersinkron' : 'Belum tersinkron'} /><DetailRow label="Wi-Fi RSSI" value={rssi != null ? `${rssi} dBm · ${signal}` : '—'} /><DetailRow label="Alamat IP lokal" value={status?.network?.local_ip || '—'} mono /><DetailRow label="Firebase" value={dataState === 'ready' ? 'Telemetri tersambung' : dataState === 'error' ? 'Akses ditolak / gagal' : 'Menghubungkan…'} /><DetailRow label="Antrean event" value={status?.firebase?.event_queue != null ? String(status.firebase.event_queue) : '—'} /><DetailRow label="Riwayat DHT terakhir" value={status?.firebase?.last_dht_history || '—'} mono /></div></div><div className="panel details-panel configuration-panel"><div className="panel-heading"><div><span className="eyebrow">KONFIGURASI · V6.1</span><h2>Sensor & otomatisasi</h2></div><Settings2 size={16} className="muted-icon" /></div><div className="details-list"><DetailRow label="Status DHT22" value={status?.dht22?.available === undefined ? 'Belum diketahui' : status.dht22.available ? 'Terhubung' : 'Tidak terhubung'} /><DetailRow label="GPIO sensor" value={String(status?.dht22?.gpio ?? settings?.dht22?.gpio ?? 32)} mono /><DetailRow label="Interval riwayat" value={`${status?.dht22?.history_interval_minutes ?? settings?.dht22?.history_interval_minutes ?? '—'} menit`} /><DetailRow label="Prakiraan cuaca" value={settings?.weather?.provider || 'Open-Meteo'} /><DetailRow label="Zona waktu" value={settings?.weather?.timezone || 'Asia/Jakarta'} /><DetailRow label="Kunci STOP" value={status?.pump?.stop_lock === undefined ? '—' : status.pump.stop_lock ? 'Aktif · lokal' : 'Tidak aktif'} /></div></div></section><section className="panel events-panel"><div className="panel-heading"><div><span className="eyebrow">LOG · PERANGKAT</span><h2>Aktivitas terbaru</h2></div><div className="event-filters">{['Semua', 'Pump', 'Fan', 'System'].map(item => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div>{filteredEvents.length ? <div className="event-list full-event-list">{filteredEvents.map((event, index) => <EventRow key={`${event.time}-${index}`} event={event} />)}</div> : <div className="system-empty"><Activity size={17} /><span>{events.length ? 'Tidak ada event dalam filter ini.' : 'Belum ada event dari perangkat.'}</span></div>}</section><section className="panel diagnostics-panel"><button className="diagnostics-toggle" onClick={() => setShowJson(!showJson)} aria-expanded={showJson}><div><span className="eyebrow">UNTUK PEMECAHAN MASALAH</span><strong>Advanced diagnostics</strong></div><ChevronDown size={17} className={showJson ? 'rotate' : ''} /></button>{showJson && <div className="diagnostics-content"><div className="diagnostics-toolbar"><span>RAW TELEMETRY · JSON</span><button onClick={copyDiagnostics}>{copied ? <Check size={13} /> : null}{copied ? 'Tersalin' : 'Salin JSON'}</button></div>{diagnosticError && <p className="inline-error">{diagnosticError}</p>}<pre>{diagnostics}</pre><span className="path-reference">/ {deviceBasePath} / status &nbsp;·&nbsp; / {deviceBasePath} / settings</span></div>}</section><footer className="page-footer"><span><LockKeyhole size={13} /> Sesi privat · {user.email}</span><span>DATA SEGAR DITENTUKAN DARI JAM ESP32</span></footer></>
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="detail-row"><span>{label}</span><strong className={mono ? 'mono-value' : ''}>{value}</strong></div>
}

function SetupScreen() {
  const [open, setOpen] = useState(false)
  return <main className="setup-screen"><div className="setup-top"><div className="brand-lockup"><span className="brand-mark"><Leaf size={20} /></span><span><strong>paludarium</strong><small>CONTROL CENTER</small></span></div><span className="setup-private"><LockKeyhole size={13} /> PRIVATE ACCESS</span></div><div className="setup-main"><div className="setup-visual"><div className="setup-water" /><div className="setup-land" /><div className="setup-leaves"><i /><i /><i /><i /><i /><b /></div></div><div className="setup-content"><div className="eyebrow">PERSIAPAN PERTAMA</div><h1>Ekosistem Anda,<br /><span>terpantau dengan tenang.</span></h1><p>Control center privat untuk Smart Paludarium Anda. Hubungkan Firebase untuk mulai menerima telemetri ESP32 secara real-time.</p><div className="setup-checklist"><div><span className="check-icon"><Check size={13} /></span> Monitoring tanpa data simulasi</div><div><span className="check-icon"><Check size={13} /></span> Sensor indoor dan cuaca ditampilkan terpisah</div><div><span className="check-icon"><Check size={13} /></span> Kontrol cloud terkunci hingga firmware V6.2</div></div><button className="setup-primary" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Tutup panduan' : 'Konfigurasi Firebase'}<ArrowRight size={16} /></button>{open && <div className="setup-env"><strong>Tambahkan variabel di pengaturan proyek</strong><p>Setiap nilai tersedia di Firebase Console → Project settings → General → Your apps. Aktifkan Firebase Authentication Email/Password dan batasi akun ke pemilik.</p><code>NEXT_PUBLIC_FIREBASE_API_KEY</code><code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code><code>NEXT_PUBLIC_FIREBASE_DATABASE_URL</code><code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code><code>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</code><code>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</code><code>NEXT_PUBLIC_FIREBASE_APP_ID</code><p className="setup-env-note">Realtime Database rules wajib membatasi akses hanya ke OWNER_UID. Jangan gunakan public read/write.</p></div>}<div className="setup-note"><ShieldCheck size={15} /><span>Data hanya dapat diakses setelah autentikasi Firebase berhasil.</span></div></div></div><div className="setup-footer"><span>SMART PALUDARIUM <b>·</b> V1.0</span><span>LOCAL AUTOMATION REMAINS INDEPENDENT</span></div></main>
}

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try { await onLogin(email.trim(), password) }
    catch (reason) {
      const code = (reason as { code?: string }).code
      setError(code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password' ? 'Email atau kata sandi tidak sesuai.' : code === 'auth/too-many-requests' ? 'Terlalu banyak percobaan. Coba lagi nanti.' : 'Tidak dapat masuk. Periksa koneksi dan konfigurasi Firebase.')
    } finally { setBusy(false) }
  }
  return <main className="login-screen"><div className="login-art"><div className="login-orb" /><div className="login-hill hill-one" /><div className="login-hill hill-two" /><div className="login-leaf leaf-a" /><div className="login-leaf leaf-b" /><div className="login-leaf leaf-c" /><span className="login-art-caption">A LIVING WORLD, IN BALANCE</span></div><div className="login-side"><div className="brand-lockup"><span className="brand-mark"><Leaf size={20} /></span><span><strong>paludarium</strong><small>CONTROL CENTER</small></span></div><div className="login-form-wrap"><span className="eyebrow">PRIVATE ACCESS</span><h1>Selamat datang.</h1><p>Masuk untuk memantau ekosistem paludarium Anda.</p><form onSubmit={handleSubmit}><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="nama@email.com" /><label htmlFor="password">Kata sandi</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Masukkan kata sandi" />{error && <div className="login-error" role="alert"><AlertTriangle size={14} />{error}</div>}<button className="login-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={16} className="spin" /> Memeriksa…</> : <>Masuk dengan aman <ArrowRight size={16} /></>}</button></form><div className="login-security"><LockKeyhole size={14} /><span>Akses privat. Akun dibuat oleh pemilik Firebase.</span></div></div><span className="login-copyright">SMART PALUDARIUM <b>·</b> ASIA/JAKARTA</span></div></main>
}

function ConfigError({ message }: { message: string }) {
  return <div className="connection-error" role="alert"><span className="connection-error-icon"><Wifi size={16} /></span><div><strong>Koneksi Firebase terputus</strong><p>{message}</p></div></div>
}

export default function Page() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [section, setSection] = useState<Section>('home')
  const [status, setStatus] = useState<PaludariumStatus | null>(null)
  const [settings, setSettings] = useState<PaludariumSettings | null>(null)
  const [events, setEvents] = useState<PaludariumEvent[]>([])
  const [dataState, setDataState] = useState<DataState>('loading')
  const [liveError, setLiveError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(Date.now())

  useEffect(() => {
    const navigate = (event: Event) => setSection((event as CustomEvent<Section>).detail)
    window.addEventListener('paludarium:navigate', navigate)
    return () => window.removeEventListener('paludarium:navigate', navigate)
  }, [])

  useEffect(() => {
    if (!firebaseAuth) { setAuthReady(true); return }
    return onAuthStateChanged(firebaseAuth, nextUser => { setUser(nextUser); setAuthReady(true) })
  }, [])

  useEffect(() => {
    if (!firebaseDatabase || !user) return
    setDataState('loading')
    setLiveError('')
    let hasStatus = false
    let hasSettings = false
    let hasEvents = false
    const updateState = () => setDataState(hasStatus && hasSettings && hasEvents ? 'ready' : 'loading')
    const statusUnsubscribe = onValue(ref(firebaseDatabase, `${deviceBasePath}/status`), snapshot => {
      setStatus(snapshot.exists() ? snapshot.val() as PaludariumStatus : null)
      hasStatus = true
      setUpdatedAt(Date.now())
      updateState()
    }, error => { setLiveError(error.message); setDataState('error') })
    const settingsUnsubscribe = onValue(ref(firebaseDatabase, `${deviceBasePath}/settings`), snapshot => {
      setSettings(snapshot.exists() ? snapshot.val() as PaludariumSettings : null)
      hasSettings = true
      updateState()
    }, error => { setLiveError(error.message); setDataState('error') })
    const eventsUnsubscribe = onValue(query(ref(firebaseDatabase, `${deviceBasePath}/events`), limitToLast(10)), snapshot => {
      const values = snapshot.val() as Record<string, PaludariumEvent> | null
      setEvents(values ? Object.values(values).reverse() : [])
      hasEvents = true
      updateState()
    }, error => { setLiveError(error.message); setDataState('error') })
    return () => { statusUnsubscribe(); settingsUnsubscribe(); eventsUnsubscribe() }
  }, [user])

  useEffect(() => {
    const interval = window.setInterval(() => setUpdatedAt(Date.now()), 15_000)
    return () => window.clearInterval(interval)
  }, [])

  const healthLabel = useMemo(() => ({ fresh: 'ONLINE', stale: 'STALE', offline: 'OFFLINE', unknown: 'UNKNOWN' })[getDeviceHealth(status, updatedAt)], [status, updatedAt])
  async function login(email: string, password: string) {
    if (!firebaseAuth) throw new Error('Firebase belum dikonfigurasi')
    await signInWithEmailAndPassword(firebaseAuth, email, password)
  }
  async function logout() { if (firebaseAuth) await signOut(firebaseAuth) }

  if (!firebaseConfigured) return <SetupScreen />
  if (!authReady) return <main className="auth-loading"><span className="brand-mark"><Leaf size={20} /></span><LoaderCircle className="spin" size={19} /><span>Menyiapkan koneksi aman…</span></main>
  if (!user) return <LoginScreen onLogin={login} />

  return <AppFrame section={section} setSection={setSection} user={user} onLogout={() => void logout()} onlineLabel={healthLabel}>
    {dataState === 'error' && <ConfigError message={liveError.includes('permission') ? 'Firebase Rules tidak mengizinkan akses untuk akun ini. Periksa OWNER_UID dan aturan Realtime Database.' : 'Tidak dapat membaca Realtime Database. Periksa koneksi dan konfigurasi Firebase.'} />}
    {section === 'home' && <DeviceStatus status={status} events={events} />}
    {section === 'history' && <HistoryPage status={status} />}
    {section === 'control' && <ControlPage status={status} />}
    {section === 'system' && <SystemPage status={status} settings={settings} events={events} dataState={dataState} user={user} />}
  </AppFrame>
}
