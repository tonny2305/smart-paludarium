'use client'

import Link from 'next/link'
import {
  Activity, Cloud, CloudRain, Cpu, Droplets, Fan, RefreshCw, ShieldCheck, Thermometer, Waves, Wind,
} from 'lucide-react'
import { usePaludarium } from '@/providers/PaludariumProvider'
import { getDeviceHealth, getDeviceTimestamp, type DeviceHealth } from '@/lib/paludarium'
import { formatHumidity, formatRelativeUpdate, formatTemperature } from '@/lib/formatters'
import { useDhtHistory } from '@/hooks/useDhtHistory'
import { DhtHistoryChart } from '@/components/history/DhtHistoryChart'
import { ConnectionError, EventRow, PageHeading, SensorCard } from '@/components/dashboard/Primitives'

const healthText: Record<DeviceHealth, string> = {
  fresh: 'ONLINE',
  stale: 'STALE',
  offline: 'OFFLINE',
  unknown: 'UNKNOWN',
}

export function DashboardHome() {
  const { status, events, dataState, error, now } = usePaludarium()
  const history = useDhtHistory('24J')
  const health = getDeviceHealth(status, now)
  const dhtAvailable = status?.dht22?.available === true
  const dhtMissing = status?.dht22?.available === false
  const temperature = dhtAvailable ? status?.dht22?.temperature_c : null
  const humidity = dhtAvailable ? status?.dht22?.humidity_percent : null
  const weather = status?.weather
  const weatherTemperature = weather?.temperature_c
  const weatherAvailable = typeof weatherTemperature === 'number' && Number.isFinite(weatherTemperature)
  const weatherState = weather?.fresh ? weather.http === 0 ? 'Tersimpan' : 'Terkini' : weather?.http === 0 ? 'Tersimpan' : 'Tertunda'

  return (
    <>
      {dataState === 'error' && <ConnectionError>{error || 'Periksa koneksi dan aturan Firebase.'}</ConnectionError>}
      <PageHeading
        eyebrow="OVERVIEW · EKOSISTEM RUMAH"
        title="Kondisi paludarium"
        detail="Pantau sensor dan perangkat tanpa perlu login."
        trailing={<div className={`health-pill ${health}`}><span className="health-pulse" />{healthText[health]}<span className="health-divider" />{formatRelativeUpdate(getDeviceTimestamp(status), now)}</div>}
      />
      <section className="hero-card">
        <div className="hero-copy">
          <div className="hero-label"><span className={`hero-online-dot ${health}`} />KONDISI PALUDARIUM <span className={`hero-state ${health}`}>{healthText[health]}</span></div>
          <h2>Sebuah ekosistem kecil,<br /><span>terjaga dengan baik.</span></h2>
          <p>{health === 'fresh' ? 'Telemetri perangkat terbaru.' : health === 'stale' ? 'Pembaruan perangkat tertunda.' : health === 'offline' ? 'Tidak ada pembaruan terbaru.' : 'Waktu perangkat belum tersedia.'} {status?.device ? `Perangkat ${status.device}` : 'Menunggu telemetri pertama dari perangkat Anda.'}</p>
          <div className="hero-facts"><span><Wind size={15} />Kipas <b>{status?.fan?.on === undefined ? '—' : status.fan.on ? 'Menyala' : 'Mati'}</b></span><i /><span><Droplets size={15} />Pompa <b>{status?.pump?.on === undefined ? '—' : status.pump.on ? 'Berjalan' : 'Siaga'}</b></span></div>
        </div>
        <div className="habitat-art" aria-hidden="true"><div className="habitat-glow" /><div className="habitat-moon" /><div className="habitat-mountain mountain-back" /><div className="habitat-mountain mountain-front" /><div className="habitat-water" /><div className="plant plant-one"><i /><i /><i /><i /><b /></div><div className="plant plant-two"><i /><i /><i /><i /><b /></div><div className="plant plant-three"><i /><i /><i /><b /></div><div className="art-grain" /></div>
        <span className="hero-meta">ESP32 <span>·</span> FIRMWARE {status?.firmware || '—'}</span>
      </section>
      <div className="section-title-row"><div><span className="eyebrow">LINGKUNGAN</span><h2>Kondisi saat ini</h2></div><span className="section-aside"><RefreshCw size={12} /> Sinkronisasi real-time</span></div>
      <section className="metrics-grid" aria-label="Metrik lingkungan">
        <SensorCard title="SUHU DALAM" icon={Thermometer} value={temperature == null ? '—' : temperature.toFixed(1)} unit={temperature == null ? undefined : '°C'} secondary={humidity == null ? 'SENSOR DHT22' : `Kelembapan ${formatHumidity(humidity)}`} status={dhtAvailable ? 'Aktif' : 'Belum aktif'} tone="temperature">
          <div className="sensor-footnote">{dhtAvailable ? 'Sensor dalam ruang' : dhtMissing ? `DHT22 belum terpasang · GPIO ${status?.dht22?.gpio ?? 32}` : 'Menunggu status sensor'}</div>
        </SensorCard>
        <SensorCard title="CUACA LUAR" icon={Cloud} value={weatherAvailable ? weatherTemperature.toFixed(1) : '—'} unit={weatherAvailable ? '°C' : undefined} secondary={weatherAvailable ? `${weather?.description || 'Kondisi luar'}${weather?.humidity_percent != null ? ` · RH ${formatHumidity(weather.humidity_percent)}` : ''}` : 'PRAKIRAAN OPEN-METEO'} status={weatherAvailable ? weatherState : 'Belum tersedia'} tone="weather">
          <div className="sensor-footnote">{weather?.rain_probability_percent != null ? <><CloudRain size={13} /> Hujan {formatHumidity(weather.rain_probability_percent)}</> : 'Prakiraan luar · Asia/Jakarta'}</div>
        </SensorCard>
        <SensorCard title="KIPAS SIRKULASI" icon={Fan} value={status?.fan?.on === undefined ? '—' : status.fan.on ? 'ON' : 'OFF'} secondary={status?.fan?.mode ? `MODE ${status.fan.mode}` : 'STATUS BELUM TERSEDIA'} status={status?.fan?.mode || 'Menunggu data'} tone="fan">
          <div className="sensor-footnote">Jadwal {status?.fan?.start_hour != null && status.fan.end_hour != null ? `${String(status.fan.start_hour).padStart(2, '0')}:00 – ${String(status.fan.end_hour).padStart(2, '0')}:00` : '—'}</div>
        </SensorCard>
        <SensorCard title="POMPA PENGISIAN" icon={Droplets} value={status?.pump?.on === undefined ? '—' : status.pump.on ? 'ON' : 'OFF'} secondary={status?.pump?.mode ? `MODE ${status.pump.mode}` : 'STATUS BELUM TERSEDIA'} status={status?.pump?.stop_lock ? 'STOP LOCK' : status?.pump?.on ? 'Sedang berjalan' : 'Siaga'} tone={status?.pump?.on ? 'pump running' : 'pump'}>
          <div className="sensor-footnote">Jadwal otomatis {status?.pump?.auto_hour != null ? `${String(status.pump.auto_hour).padStart(2, '0')}:${String(status.pump.auto_minute ?? 0).padStart(2, '0')} WIB` : '—'} · {status?.pump?.auto_seconds ?? '—'} dtk</div>
        </SensorCard>
      </section>
      <section className="home-lower">
        <article className="panel trend-panel">
          <div className="panel-heading"><div><span className="eyebrow">SENSOR DALAM · DHT22</span><h2>Tren 24 jam</h2></div><Link className="text-link" href="/history">Riwayat lengkap <Activity size={14} /></Link></div>
          {history.status === 'loading' && <div className="chart-placeholder" role="status">Memuat riwayat DHT22…</div>}
          {history.status === 'error' && <div className="chart-placeholder" role="alert">Riwayat belum dapat dimuat. Periksa akses Firebase.</div>}
          {history.status === 'ready' && !history.points.length && <div className="chart-empty"><div className="chart-empty-icon"><Activity size={18} /></div><div><strong>{dhtAvailable ? 'Belum ada riwayat sensor' : dhtMissing ? 'DHT22 belum terpasang' : 'Menunggu status DHT22'}</strong><p>{dhtAvailable ? 'Data per jam akan tampil setelah pembacaan tersimpan.' : dhtMissing ? `GPIO ${status?.dht22?.gpio ?? 32} siap. Tren muncul setelah sensor mengirim data.` : 'Status sensor akan tampil setelah perangkat mengirim telemetri.'}</p></div><span className="sample-note">1 sampel / jam</span></div>}
          {history.status === 'ready' && history.points.length > 0 && <DhtHistoryChart points={history.points} range="24J" compact />}
          {history.status === 'ready' && history.points.length > 0 && <div className="chart-baseline"><span>24 jam terakhir</span><span>WIB</span></div>}
        </article>
        <article className="panel activity-panel">
          <div className="panel-heading"><div><span className="eyebrow">LOG PERANGKAT</span><h2>Aktivitas terbaru</h2></div><span className="live-label"><span className="live-indicator" />LIVE</span></div>
          {events.length ? <div className="event-list">{events.slice(0, 4).map(event => <EventRow key={event.key} event={event} />)}</div> : <div className="activity-empty"><div className="empty-ring"><Activity size={18} /></div><strong>Belum ada aktivitas</strong><span>Event dari ESP32 akan tercatat di sini.</span></div>}
        </article>
      </section>
      <footer className="page-footer"><span><ShieldCheck size={14} /> Otomasi lokal ESP32 tetap berjalan tanpa koneksi cloud.</span><span>ASIA/JAKARTA <b>·</b> WIB</span></footer>
    </>
  )
}
