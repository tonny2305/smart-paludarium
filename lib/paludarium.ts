export interface PaludariumStatus {
  device?: string
  firmware?: string
  online?: boolean
  clock?: {
    rtc_ready?: boolean
    ntp_synced?: boolean
    text?: string
    epoch_local_basis?: number
    date_key?: number
  }
  network?: { rssi_dbm?: number; local_ip?: string }
  fan?: { on?: boolean; mode?: string; start_hour?: number; end_hour?: number }
  pump?: {
    on?: boolean
    mode?: string
    manual_hold?: boolean
    manual_timer_seconds?: number
    auto_hour?: number
    auto_minute?: number
    auto_seconds?: number
    daily_seconds?: number
    daily_runs?: number
    stop_lock?: boolean
  }
  weather?: {
    fresh?: boolean
    http?: number
    description?: string
    temperature_c?: number | null
    humidity_percent?: number | null
    rain_probability_percent?: number | null
    forecast_time?: string
  }
  capabilities?: { cloud_commands?: boolean }
  dht22?: {
    gpio?: number
    available?: boolean
    history_interval_minutes?: number
    temperature_c?: number | null
    humidity_percent?: number | null
  }
  firebase?: { event_queue?: number; last_dht_history?: string }
  system?: { free_heap?: number; uptime_seconds?: number; firebase_transport?: string }
}

export interface PaludariumSettings {
  firmware?: string
  fan?: { mode?: string; auto_start_hour?: number; auto_end_hour?: number }
  pump?: {
    mode?: string
    manual_timer_seconds?: number
    auto_hour?: number
    auto_minute?: number
    auto_seconds?: number
    manual_hold_failsafe_seconds?: number
    float_installed?: boolean
    allow_auto_without_float?: boolean
  }
  dht22?: { gpio?: number; history_interval_minutes?: number }
  weather?: { provider?: string; timezone?: string }
}

export interface PaludariumEvent {
  key: string
  type?: string
  action?: string
  detail?: string
  time?: string
  firmware?: string
  uptime_seconds?: number
  epoch_local_basis?: number
}

export type DeviceHealth = 'fresh' | 'stale' | 'offline' | 'unknown'

type FirebaseRecord = Record<string, unknown>

function record(value: unknown): FirebaseRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as FirebaseRecord
    : null
}

function stringField(source: FirebaseRecord, key: string): string | undefined {
  return typeof source[key] === 'string' ? source[key] as string : undefined
}

function numberField(source: FirebaseRecord, key: string): number | undefined {
  const value = source[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function booleanField(source: FirebaseRecord, key: string): boolean | undefined {
  return typeof source[key] === 'boolean' ? source[key] as boolean : undefined
}

function nullableNumberField(source: FirebaseRecord, key: string): number | null | undefined {
  return source[key] === null ? null : numberField(source, key)
}

function nested<T>(value: unknown, parse: (source: FirebaseRecord) => T): T | undefined {
  const source = record(value)
  return source ? parse(source) : undefined
}

export function normalizeStatus(value: unknown): PaludariumStatus | null {
  const source = record(value)
  if (!source) return null
  return {
    device: stringField(source, 'device'),
    firmware: stringField(source, 'firmware'),
    online: booleanField(source, 'online'),
    clock: nested(source.clock, item => ({
      rtc_ready: booleanField(item, 'rtc_ready'),
      ntp_synced: booleanField(item, 'ntp_synced'),
      text: stringField(item, 'text'),
      epoch_local_basis: numberField(item, 'epoch_local_basis'),
      date_key: numberField(item, 'date_key'),
    })),
    network: nested(source.network, item => ({
      rssi_dbm: numberField(item, 'rssi_dbm'),
      local_ip: stringField(item, 'local_ip'),
    })),
    fan: nested(source.fan, item => ({
      on: booleanField(item, 'on'),
      mode: stringField(item, 'mode'),
      start_hour: numberField(item, 'start_hour'),
      end_hour: numberField(item, 'end_hour'),
    })),
    pump: nested(source.pump, item => ({
      on: booleanField(item, 'on'),
      mode: stringField(item, 'mode'),
      manual_hold: booleanField(item, 'manual_hold'),
      manual_timer_seconds: numberField(item, 'manual_timer_seconds'),
      auto_hour: numberField(item, 'auto_hour'),
      auto_minute: numberField(item, 'auto_minute'),
      auto_seconds: numberField(item, 'auto_seconds'),
      daily_seconds: numberField(item, 'daily_seconds'),
      daily_runs: numberField(item, 'daily_runs'),
      stop_lock: booleanField(item, 'stop_lock'),
    })),
    weather: nested(source.weather, item => ({
      fresh: booleanField(item, 'fresh'),
      http: numberField(item, 'http'),
      description: stringField(item, 'description'),
      temperature_c: nullableNumberField(item, 'temperature_c'),
      humidity_percent: nullableNumberField(item, 'humidity_percent'),
      rain_probability_percent: nullableNumberField(item, 'rain_probability_percent'),
      forecast_time: stringField(item, 'forecast_time'),
    })),
    capabilities: nested(source.capabilities, item => ({
      cloud_commands: booleanField(item, 'cloud_commands'),
    })),
    dht22: nested(source.dht22, item => ({
      gpio: numberField(item, 'gpio'),
      available: booleanField(item, 'available'),
      history_interval_minutes: numberField(item, 'history_interval_minutes'),
      temperature_c: nullableNumberField(item, 'temperature_c'),
      humidity_percent: nullableNumberField(item, 'humidity_percent'),
    })),
    firebase: nested(source.firebase, item => ({
      event_queue: numberField(item, 'event_queue'),
      last_dht_history: stringField(item, 'last_dht_history'),
    })),
    system: nested(source.system, item => ({
      free_heap: numberField(item, 'free_heap'),
      uptime_seconds: numberField(item, 'uptime_seconds'),
      firebase_transport: stringField(item, 'firebase_transport'),
    })),
  }
}

export function normalizeSettings(value: unknown): PaludariumSettings | null {
  const source = record(value)
  if (!source) return null
  return {
    firmware: stringField(source, 'firmware'),
    fan: nested(source.fan, item => ({
      mode: stringField(item, 'mode'),
      auto_start_hour: numberField(item, 'auto_start_hour'),
      auto_end_hour: numberField(item, 'auto_end_hour'),
    })),
    pump: nested(source.pump, item => ({
      mode: stringField(item, 'mode'),
      manual_timer_seconds: numberField(item, 'manual_timer_seconds'),
      auto_hour: numberField(item, 'auto_hour'),
      auto_minute: numberField(item, 'auto_minute'),
      auto_seconds: numberField(item, 'auto_seconds'),
      manual_hold_failsafe_seconds: numberField(item, 'manual_hold_failsafe_seconds'),
      float_installed: booleanField(item, 'float_installed'),
      allow_auto_without_float: booleanField(item, 'allow_auto_without_float'),
    })),
    dht22: nested(source.dht22, item => ({
      gpio: numberField(item, 'gpio'),
      history_interval_minutes: numberField(item, 'history_interval_minutes'),
    })),
    weather: nested(source.weather, item => ({
      provider: stringField(item, 'provider'),
      timezone: stringField(item, 'timezone'),
    })),
  }
}

export function normalizeEvents(value: unknown): PaludariumEvent[] {
  const source = record(value)
  if (!source) return []
  return Object.entries(source)
    .flatMap(([key, raw]) => {
      const event = record(raw)
      if (!event) return []
      return [{
        key,
        type: stringField(event, 'type'),
        action: stringField(event, 'action'),
        detail: stringField(event, 'detail'),
        time: stringField(event, 'time'),
        firmware: stringField(event, 'firmware'),
        uptime_seconds: numberField(event, 'uptime_seconds'),
        epoch_local_basis: numberField(event, 'epoch_local_basis'),
      }]
    })
    .reverse()
}

export function getDeviceTimestamp(status: PaludariumStatus | null): number | null {
  const date = String(status?.clock?.date_key ?? '')
  const clockText = status?.clock?.text
  const match = clockText?.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})/)
  if (!match || !/^\d{8}$/.test(date)) return null

  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(4, 6))
  const day = Number(date.slice(6, 8))
  const [, textDay, textMonth, hour, minute, second] = match
  if (
    Number(textDay) !== day
    || Number(textMonth) !== month
    || Number(hour) > 23
    || Number(minute) > 59
    || Number(second) > 59
  ) return null

  const wallClock = new Date(Date.UTC(year, month - 1, day))
  if (wallClock.getUTCFullYear() !== year || wallClock.getUTCMonth() !== month - 1 || wallClock.getUTCDate() !== day) return null
  return Date.UTC(year, month - 1, day, Number(hour) - 7, Number(minute), Number(second))
}

export function getDeviceHealth(status: PaludariumStatus | null, now = Date.now()): DeviceHealth {
  const timestamp = getDeviceTimestamp(status)
  if (timestamp === null) return 'unknown'
  const ageSeconds = (now - timestamp) / 1000
  if (ageSeconds < -90) return 'unknown'
  if (ageSeconds <= 90) return 'fresh'
  if (ageSeconds <= 300) return 'stale'
  return 'offline'
}

export function firmwareSupportsCloudCommands(firmware?: string): boolean {
  const match = firmware?.match(/(\d+)\.(\d+)/)
  if (!match) return false
  const [, major, minor] = match.map(Number)
  return major > 6 || (major === 6 && minor >= 2)
}
