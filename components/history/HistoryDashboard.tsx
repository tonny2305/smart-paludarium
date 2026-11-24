'use client'

import { useState } from 'react'
import { CircleHelp, Droplets, Thermometer } from 'lucide-react'
import { DhtHistoryChart } from '@/components/history/DhtHistoryChart'
import { PageHeading } from '@/components/dashboard/Primitives'
import { useDhtHistory } from '@/hooks/useDhtHistory'
import { usePaludarium } from '@/providers/PaludariumProvider'
import { formatHumidity, formatTemperature } from '@/lib/formatters'
import type { DhtHistoryRange } from '@/lib/history'

const ranges: { id: DhtHistoryRange; label: string }[] = [
  { id: '24J', label: '24J' },
  { id: '7H', label: '7H' },
  { id: '30H', label: '30H' },
]

function SummaryCard({ title, icon: Icon, values, unit }: {
  title: string
  icon: typeof Thermometer
  values: number[]
  unit: 'temperature' | 'humidity'
}) {
  const latest = values.at(-1)
  const minimum = values.length ? Math.min(...values) : null
  const maximum = values.length ? Math.max(...values) : null
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
  const format = unit === 'temperature' ? formatTemperature : formatHumidity

  return (
    <article className="panel history-stat-card">
      <div className={`summary-label${unit === 'humidity' ? ' blue' : ''}`}><Icon size={15} />{title}</div>
      <strong>{format(latest)}</strong>
      <div className="history-stat-details">
        <span>Min <b>{format(minimum)}</b></span><span>Rata-rata <b>{format(average)}</b></span><span>Max <b>{format(maximum)}</b></span>
      </div>
    </article>
  )
}

function HistoryEmpty({ sensorAvailable }: { sensorAvailable?: boolean }) {
  const title = sensorAvailable === true ? 'Belum ada data historis'
    : sensorAvailable === false ? 'DHT22 belum terpasang'
      : 'Menunggu status DHT22'
  const description = sensorAvailable === true
    ? 'Riwayat akan dimulai setelah pembacaan sensor tersimpan di Firebase.'
    : sensorAvailable === false
      ? 'GPIO32 sudah siap. Setelah sensor terbaca, suhu dan kelembapan akan muncul otomatis dan satu sampel disimpan setiap jam.'
      : 'Status sensor akan tampil setelah perangkat mengirim telemetri.'
  return (
    <div className="history-empty">
      <div className="empty-orbit"><Thermometer size={23} /><span><Droplets size={13} /></span></div>
      <strong>{title}</strong>
      <p>{description}</p>
      <div className="history-empty-meta"><span>FREKUENSI <b>1× / JAM</b></span><span>SUMBER <b>ESP32 · Firebase</b></span></div>
    </div>
  )
}

export function HistoryDashboard() {
  const [range, setRange] = useState<DhtHistoryRange>('24J')
  const { status } = usePaludarium()
  const history = useDhtHistory(range)
  const temperature = history.points.map(point => point.temperatureC)
  const humidity = history.points.map(point => point.humidityPercent)

  return (
    <>
      <PageHeading eyebrow="LINGKUNGAN · TREN" title="Riwayat sensor" detail="Suhu dan kelembapan dalam paludarium, dicatat setiap jam." trailing={<span className="data-source"><Thermometer size={14} /> DHT22 · GPIO {status?.dht22?.gpio ?? 32}</span>} />
      {history.status === 'ready' && history.points.length > 0 && <div className="history-summary">
        <SummaryCard title="SUHU · TERBARU" icon={Thermometer} values={temperature} unit="temperature" />
        <SummaryCard title="KELEMBAPAN · TERBARU" icon={Droplets} values={humidity} unit="humidity" />
        <div className="history-range" aria-label="Rentang riwayat">{ranges.map(item => <button key={item.id} type="button" aria-pressed={range === item.id} onClick={() => setRange(item.id)} className={range === item.id ? 'selected' : ''}>{item.label}</button>)}</div>
      </div>}
      {(history.status === 'loading' || history.status === 'error' || history.status === 'ready' && !history.points.length) && <div className="history-summary">
        <div className="history-range" aria-label="Rentang riwayat">{ranges.map(item => <button key={item.id} type="button" aria-pressed={range === item.id} onClick={() => setRange(item.id)} className={range === item.id ? 'selected' : ''}>{item.label}</button>)}</div>
      </div>}
      <section className="panel history-chart-panel" aria-live="polite">
        <div className="panel-heading"><div><span className="eyebrow">DHT22 · {range === '24J' ? '24 JAM TERAKHIR' : range === '7H' ? '7 HARI TERAKHIR' : '30 HARI TERAKHIR'}</span><h2>Perubahan lingkungan</h2></div><span className="chart-legend"><span className="legend-temp" />Suhu <span className="legend-humidity" />Kelembapan</span></div>
        {history.status === 'loading' && <div className="history-message" role="status">Memuat riwayat sensor…</div>}
        {history.status === 'error' && <div className="history-message error" role="alert">Riwayat gagal dimuat. Periksa koneksi dan izin Firebase.</div>}
        {history.status === 'ready' && history.points.length === 0 && <HistoryEmpty sensorAvailable={status?.dht22?.available} />}
        {history.status === 'ready' && history.points.length > 0 && <DhtHistoryChart points={history.points} range={range} />}
      </section>
      <div className="info-strip"><CircleHelp size={16} /><span>Data suhu dalam ruang berasal dari DHT22. Prakiraan cuaca luar ditampilkan terpisah di beranda.</span></div>
    </>
  )
}
