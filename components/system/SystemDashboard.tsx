'use client'

import { useMemo, useState } from 'react'
import { Activity, ChevronDown, CircleHelp, Cpu, Wifi } from 'lucide-react'
import { ConnectionError, DetailRow, EventRow, PageHeading } from '@/components/dashboard/Primitives'
import { usePaludarium } from '@/providers/PaludariumProvider'
import { getDeviceHealth } from '@/lib/paludarium'
import { formatRssi, formatTemperature, formatUptime } from '@/lib/formatters'

const filters = ['Semua', 'Pompa', 'Kipas', 'Sistem'] as const

function isIpv4(value: string): boolean {
  const parts = value.split('.')
  return parts.length === 4 && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

export function SystemDashboard() {
  const { status, settings, events, dataState, error, now } = usePaludarium()
  const [filter, setFilter] = useState<(typeof filters)[number]>('Semua')
  const [showJson, setShowJson] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const health = getDeviceHealth(status, now)
  const filteredEvents = events.filter(event => {
    if (filter === 'Semua') return true
    const type = event.type?.toLowerCase()
    return filter === 'Pompa' ? type === 'pump' || type === 'pompa'
      : filter === 'Kipas' ? type === 'fan' || type === 'kipas'
        : type !== 'pump' && type !== 'pompa' && type !== 'fan' && type !== 'kipas'
  })
  const diagnostics = useMemo(() => JSON.stringify({ status, settings, events }, null, 2), [status, settings, events])
  const localIp = status?.network?.local_ip
  const signalQuality = status?.network?.rssi_dbm == null ? '—' : formatRssi(status.network.rssi_dbm)
  const weatherState = status?.weather?.fresh ? status.weather.http === 0 ? 'Tersimpan · cache' : 'Terkini'
    : status?.weather?.http === 0 ? 'Tersimpan · cache'
      : status?.weather?.http != null ? `HTTP ${status.weather.http}` : 'Belum tersedia'

  async function copyDiagnostics() {
    try {
      await navigator.clipboard.writeText(diagnostics)
      setCopied(true)
      setCopyError('')
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopyError('Clipboard tidak tersedia di browser ini.')
    }
  }

  return (
    <>
      {dataState === 'error' && <ConnectionError>{error || 'Periksa koneksi dan aturan Firebase.'}</ConnectionError>}
      <PageHeading eyebrow="DIAGNOSTIK · PERANGKAT" title="Sistem & aktivitas" detail="Kesehatan perangkat, koneksi, dan catatan operasional." trailing={<span className={`health-pill ${health}`}><span className="health-pulse" />{health.toUpperCase()}</span>} />
      <section className="system-overview">
        <article className="panel device-card"><div className="device-orb"><Cpu size={24} /></div><div><span className="eyebrow">PERANGKAT</span><h2>{status?.device || 'Smart Paludarium'}</h2><p>ESP32 WROOM-32 <span>·</span> Firmware {status?.firmware || '—'}</p></div><div className="device-health"><span className={`tiny-dot ${health === 'fresh' ? 'green' : health === 'stale' ? 'amber' : ''}`} />{health === 'fresh' ? 'Terhubung' : health === 'unknown' ? 'Menunggu data' : health === 'stale' ? 'Data tertunda' : 'Offline'}</div></article>
        <article className="panel uptime-card"><span className="summary-label"><Activity size={14} /> UPTIME</span><strong>{formatUptime(status?.system?.uptime_seconds)}</strong><span>Heap bebas {status?.system?.free_heap != null ? `${Math.round(status.system.free_heap / 1024)} KB` : '—'}</span></article>
      </section>
      <section className="system-details">
        <article className="panel details-panel"><div className="panel-heading"><div><span className="eyebrow">KONEKTIVITAS</span><h2>Informasi perangkat</h2></div><span className="mini-badge"><Wifi size={12} /> ESP32</span></div>
          <div className="details-list">
            <DetailRow label="Waktu perangkat" value={status?.clock?.text || 'Belum tersedia'} />
            <DetailRow label="RTC" value={status?.clock?.rtc_ready === undefined ? 'Belum diketahui' : status.clock.rtc_ready ? 'Siap' : 'Tidak siap'} />
            <DetailRow label="Sinkronisasi NTP" value={status?.clock?.ntp_synced === undefined ? 'Belum diketahui' : status.clock.ntp_synced ? 'Tersinkron' : 'Belum tersinkron'} />
            <DetailRow label="Wi-Fi RSSI" value={signalQuality} />
            <DetailRow label="Alamat IP lokal" value={localIp || 'Belum tersedia'} mono>
              {localIp && isIpv4(localIp) ? <a href={`http://${localIp}`} target="_blank" rel="noopener noreferrer">Buka dashboard lokal ↗</a> : <strong className="mono-value">{localIp || 'Belum tersedia'}</strong>}
            </DetailRow>
            <DetailRow label="Firebase telemetry" value={dataState === 'ready' ? 'Terhubung' : dataState === 'error' ? 'Akses gagal' : 'Menghubungkan…'} />
            <DetailRow label="Antrean event" value={status?.firebase?.event_queue == null ? '—' : String(status.firebase.event_queue)} />
            <DetailRow label="Riwayat DHT terakhir" value={status?.firebase?.last_dht_history || '—'} mono />
          </div>
        </article>
        <article className="panel details-panel configuration-panel"><div className="panel-heading"><div><span className="eyebrow">KONFIGURASI · V6.1</span><h2>Sensor & otomatisasi</h2></div><CircleHelp size={16} className="muted-icon" /></div>
          <div className="details-list">
            <DetailRow label="Status DHT22" value={status?.dht22?.available === undefined ? 'Belum diketahui' : status.dht22.available ? 'Terpasang' : 'Belum terpasang'} />
            <DetailRow label="GPIO sensor" value={String(status?.dht22?.gpio ?? settings?.dht22?.gpio ?? 32)} mono />
            <DetailRow label="Interval riwayat" value={`${status?.dht22?.history_interval_minutes ?? settings?.dht22?.history_interval_minutes ?? '—'} menit`} />
            <DetailRow label="Prakiraan cuaca" value={settings?.weather?.provider || 'Open-Meteo'} />
            <DetailRow label="Status cuaca" value={weatherState} />
            <DetailRow label="Suhu luar" value={formatTemperature(status?.weather?.temperature_c)} />
            <DetailRow label="Kelembapan luar" value={status?.weather?.humidity_percent == null ? '—' : `${Math.round(status.weather.humidity_percent)}%`} />
            <DetailRow label="STOP lock" value={status?.pump?.stop_lock === undefined ? 'Belum diketahui' : status.pump.stop_lock ? 'Aktif · lokal' : 'Tidak aktif'} />
            <DetailRow label="Transport Firebase" value={status?.system?.firebase_transport || '—'} />
            <DetailRow label="Cuaca diperbarui" value={status?.weather?.forecast_time || '—'} mono />
          </div>
        </article>
      </section>
      <section className="panel events-panel">
        <div className="panel-heading"><div><span className="eyebrow">LOG · PERANGKAT</span><h2>Aktivitas terbaru</h2></div><div className="event-filters" aria-label="Filter aktivitas">{filters.map(item => <button key={item} type="button" aria-pressed={filter === item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
        {filteredEvents.length ? <div className="event-list full-event-list">{filteredEvents.map(event => <EventRow key={event.key} event={event} />)}</div> : <div className="system-empty"><Activity size={17} /><span>{events.length ? 'Tidak ada aktivitas dalam filter ini.' : 'Belum ada event dari perangkat.'}</span></div>}
      </section>
      <section className="panel diagnostics-panel">
        <button className="diagnostics-toggle" type="button" onClick={() => setShowJson(!showJson)} aria-expanded={showJson}><div><span className="eyebrow">UNTUK PEMECAHAN MASALAH</span><strong>Advanced diagnostics</strong></div><ChevronDown size={17} className={showJson ? 'rotate' : ''} /></button>
        {showJson && <div className="diagnostics-content"><div className="diagnostics-toolbar"><span>RAW TELEMETRY · JSON</span><button type="button" onClick={() => void copyDiagnostics()}>{copied ? 'Tersalin' : 'Salin JSON'}</button></div>{copyError && <p className="inline-error" role="alert">{copyError}</p>}<pre>{diagnostics}</pre></div>}
      </section>
    </>
  )
}
