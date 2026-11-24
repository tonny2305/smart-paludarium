import { get, ref } from 'firebase/database'
import { deviceBasePath, firebaseDatabase } from '@/lib/firebase'
import { getJakartaDateKeys, normalizeDhtHistoryPoint } from '@/lib/history-core'
import type { DhtHistoryPoint } from '@/lib/history-core'

export { getJakartaDateKeys, normalizeDhtHistoryPoint } from '@/lib/history-core'
export type { DhtHistoryPoint } from '@/lib/history-core'

export type DhtHistoryRange = '24J' | '7H' | '30H'

const rangeMilliseconds: Record<DhtHistoryRange, number> = {
  '24J': 24 * 60 * 60 * 1000,
  '7H': 7 * 24 * 60 * 60 * 1000,
  '30H': 30 * 24 * 60 * 60 * 1000,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export async function getDhtHistory(range: DhtHistoryRange, now = new Date()): Promise<DhtHistoryPoint[]> {
  const database = firebaseDatabase
  if (!database) throw new Error('Firebase belum dikonfigurasi')
  const end = now.getTime()
  const start = end - rangeMilliseconds[range]
  const dateKeys = getJakartaDateKeys(start, end)
  const snapshots = await Promise.all(dateKeys.map(dateKey =>
    get(ref(database, `${deviceBasePath}/history/dht22/${dateKey}`)),
  ))

  return snapshots
    .flatMap((snapshot, index) => {
      const day = snapshot.val()
      if (!isRecord(day)) return []
      return Object.entries(day)
        .map(([hourKey, value]) => normalizeDhtHistoryPoint(dateKeys[index], hourKey, value))
        .filter((point): point is DhtHistoryPoint => point !== null)
    })
    .filter(point => point.timestamp.getTime() >= start && point.timestamp.getTime() <= end)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}
