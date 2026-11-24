export interface DhtHistoryPoint {
  timestamp: Date
  temperatureC: number
  humidityPercent: number
  dateKey: string
  hourKey: string
}

const jakartaDateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function dateKeyAt(timestamp: number): string {
  const parts = jakartaDateParts.formatToParts(timestamp)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function getJakartaDateKeys(start: number, end: number): string[] {
  const first = dateKeyAt(start).split('-').map(Number)
  const last = dateKeyAt(end).split('-').map(Number)
  const cursor = Date.UTC(first[0], first[1] - 1, first[2])
  const lastDay = Date.UTC(last[0], last[1] - 1, last[2])
  const keys: string[] = []
  for (let day = cursor; day <= lastDay; day += 24 * 60 * 60 * 1000) {
    keys.push(new Date(day).toISOString().slice(0, 10))
  }
  return keys
}

function validDateKey(dateKey: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeDhtHistoryPoint(dateKey: string, hourKey: string, value: unknown): DhtHistoryPoint | null {
  if (!validDateKey(dateKey) || !/^\d{1,2}$/.test(hourKey) || !isRecord(value)) return null
  const hour = Number(hourKey)
  const temperatureC = value.temperature_c
  const humidityPercent = value.humidity_percent
  if (
    hour < 0 || hour > 23
    || typeof temperatureC !== 'number' || !Number.isFinite(temperatureC)
    || typeof humidityPercent !== 'number' || !Number.isFinite(humidityPercent)
    || humidityPercent < 0 || humidityPercent > 100
  ) return null

  const [year, month, day] = dateKey.split('-').map(Number)
  return {
    timestamp: new Date(Date.UTC(year, month - 1, day, hour - 7)),
    temperatureC,
    humidityPercent,
    dateKey,
    hourKey: String(hour).padStart(2, '0'),
  }
}
