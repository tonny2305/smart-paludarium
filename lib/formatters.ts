export function formatTemperature(value?: number | null): string {
  return value == null || !Number.isFinite(value) ? '—' : `${value.toFixed(1)} °C`
}

export function formatHumidity(value?: number | null): string {
  return value == null || !Number.isFinite(value) ? '—' : `${Math.round(value)}%`
}

export function formatDuration(seconds?: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 60) return `${Math.floor(seconds)} dtk`
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return remainder ? `${minutes} mnt ${remainder} dtk` : `${minutes} mnt`
}

export function formatUptime(seconds?: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—'
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  return [days && `${days} hari`, `${hours} jam`, `${minutes} mnt`].filter(Boolean).join(' ')
}

export function formatRssi(rssi?: number | null): string {
  if (rssi == null || !Number.isFinite(rssi)) return '—'
  const quality = rssi >= -50 ? 'Sangat baik' : rssi >= -60 ? 'Baik' : rssi >= -70 ? 'Cukup' : 'Lemah'
  return `${rssi} dBm · ${quality}`
}

export function formatWibTime(value: number | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value)
}

export function formatWibDateTime(value: number | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value)
}

export function formatRelativeUpdate(timestamp: number | null, now = Date.now()): string {
  if (timestamp === null) return 'Waktu perangkat belum tersedia'
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (seconds < 60) return `Diperbarui ${seconds} dtk lalu`
  if (seconds < 3600) return `Diperbarui ${Math.floor(seconds / 60)} mnt lalu`
  return `Diperbarui ${Math.floor(seconds / 3600)} jam lalu`
}
