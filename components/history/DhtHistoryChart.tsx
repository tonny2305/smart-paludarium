'use client'

import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { formatHumidity, formatTemperature, formatWibDateTime, formatWibTime } from '@/lib/formatters'
import type { DhtHistoryPoint, DhtHistoryRange } from '@/lib/history'

interface ChartPoint {
  timestamp: number
  temperatureC: number | null
  humidityPercent: number | null
}

function chartPoints(points: DhtHistoryPoint[], range: DhtHistoryRange): ChartPoint[] {
  const duration = range === '24J' ? 24 : range === '7H' ? 168 : 720
  const now = Date.now()
  const start = Math.floor((now - duration * 60 * 60 * 1000) / 3_600_000) * 3_600_000
  const end = Math.floor(now / 3_600_000) * 3_600_000
  const byTime = new Map(points.map(point => [point.timestamp.getTime(), point]))
  const output: ChartPoint[] = []

  for (let timestamp = start; timestamp <= end; timestamp += 3_600_000) {
    const point = byTime.get(timestamp)
    output.push({
      timestamp,
      temperatureC: point?.temperatureC ?? null,
      humidityPercent: point?.humidityPercent ?? null,
    })
  }
  return output
}

function TimeTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ dataKey?: string; value?: number | null }>
  label?: number | string
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const value = typeof item.value === 'number' ? item.value : null
  return (
    <div className="chart-tooltip">
      <strong>{label == null ? '—' : formatWibDateTime(Number(label))} WIB</strong>
      <span className={item.dataKey === 'temperatureC' ? 'temperature' : 'humidity'}>
        {item.dataKey === 'temperatureC' ? formatTemperature(value) : formatHumidity(value)}
      </span>
    </div>
  )
}

export function DhtHistoryChart({ points, range, compact = false }: {
  points: DhtHistoryPoint[]
  range: DhtHistoryRange
  compact?: boolean
}) {
  const data = chartPoints(points, range)
  const height = compact ? 106 : 158
  const common = {
    data,
    margin: { top: 8, right: 6, bottom: 0, left: -18 },
    syncId: 'dht-history',
  }

  return (
    <div className={`dht-charts${compact ? ' compact' : ''}`} role="group" aria-label="Grafik suhu dan kelembapan DHT22">
      <div className="dht-chart">
        {!compact && <div className="chart-title temperature">Suhu · °C</div>}
        <ResponsiveContainer width="100%" height={height}>
          <LineChart {...common}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={value => formatWibTime(Number(value))} minTickGap={32} tick={{ fontSize: 9, fill: 'var(--chart-tick)' }} />
            <YAxis domain={['auto', 'auto']} width={36} tick={{ fontSize: 9, fill: 'var(--chart-tick)' }} />
            <Tooltip content={<TimeTooltip />} />
            <Line dataKey="temperatureC" name="Suhu" stroke="#e5a65f" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="dht-chart">
        {!compact && <div className="chart-title humidity">Kelembapan · %</div>}
        <ResponsiveContainer width="100%" height={height}>
          <LineChart {...common}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={value => formatWibTime(Number(value))} minTickGap={32} tick={{ fontSize: 9, fill: 'var(--chart-tick)' }} />
            <YAxis domain={[0, 100]} width={36} tick={{ fontSize: 9, fill: 'var(--chart-tick)' }} />
            <Tooltip content={<TimeTooltip />} />
            <Line dataKey="humidityPercent" name="Kelembapan" stroke="#68bdd2" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
