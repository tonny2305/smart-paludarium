import type { ComponentType, ReactNode } from 'react'
import { Activity, Cpu, Droplets, Fan } from 'lucide-react'
import type { PaludariumEvent } from '@/lib/paludarium'

export function PageHeading({ eyebrow, title, detail, trailing }: {
  eyebrow: string
  title: string
  detail: string
  trailing?: ReactNode
}) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{detail}</p></div>{trailing}</div>
}

export function SensorCard({ title, icon: Icon, value, unit, secondary, status, tone, children }: {
  title: string
  icon: ComponentType<{ size?: number }>
  value: string
  unit?: string
  secondary?: string
  status: string
  tone: string
  children?: ReactNode
}) {
  return (
    <article className={`sensor-card ${tone}`}>
      <div className="card-top"><span className="icon-tile"><Icon size={17} /></span><span className="card-kicker">{title}</span><span className="card-status"><span className="status-dot" />{status}</span></div>
      <div className="sensor-reading">{value}{unit && <span className="sensor-unit">{unit}</span>}</div>
      {secondary && <div className="sensor-secondary">{secondary}</div>}
      {children}
    </article>
  )
}

export function EventRow({ event }: { event: PaludariumEvent }) {
  const type = event.type?.toLowerCase()
  const Icon = type === 'fan' ? Fan : type === 'pump' ? Droplets : type === 'system' ? Cpu : Activity
  const action = event.action?.toUpperCase()
  const description = type === 'pump'
    ? action === 'ON' ? 'Pompa mulai bekerja' : action === 'OFF' || action === 'STOP' ? 'Pompa berhenti' : event.action || 'Aktivitas pompa'
    : type === 'fan'
      ? action === 'ON' ? 'Kipas menyala' : action === 'OFF' ? 'Kipas berhenti' : event.action || 'Aktivitas kipas'
      : type === 'system'
        ? action === 'BOOT' ? 'ESP32 dinyalakan' : event.action || 'Pembaruan sistem'
        : [event.type, event.action].filter(Boolean).join(' · ') || 'Aktivitas perangkat'
  const time = event.time?.match(/(\d{2}:\d{2})(?::\d{2})?\s*WIB?/i)?.[1] || event.time || '—'
  return (
    <div className="event-row">
      <span className={`event-icon ${type || 'system'}`}><Icon size={15} /></span>
      <div className="event-copy"><strong>{description}</strong><span>{event.detail || `Firmware ${event.firmware || '—'}`}</span></div>
      <time>{time}</time>
    </div>
  )
}

export function DetailRow({ label, value, mono, children }: {
  label: string
  value?: string
  mono?: boolean
  children?: ReactNode
}) {
  return <div className="detail-row"><span>{label}</span>{children || <strong className={mono ? 'mono-value' : ''}>{value || '—'}</strong>}</div>
}

export function ConnectionError({ children }: { children: ReactNode }) {
  return <div className="connection-error" role="alert"><span className="connection-error-icon"><Activity size={16} /></span><div><strong>Koneksi data bermasalah</strong><p>{children}</p></div></div>
}
