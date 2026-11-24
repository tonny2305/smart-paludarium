'use client'

import { useEffect, useState } from 'react'
import { getDhtHistory, type DhtHistoryPoint, type DhtHistoryRange } from '@/lib/history'

type HistoryState =
  | { status: 'loading'; points: DhtHistoryPoint[]; error: null }
  | { status: 'ready'; points: DhtHistoryPoint[]; error: null }
  | { status: 'error'; points: DhtHistoryPoint[]; error: string }

export function useDhtHistory(range: DhtHistoryRange) {
  const [state, setState] = useState<HistoryState>({ status: 'loading', points: [], error: null })

  useEffect(() => {
    let active = true
    setState({ status: 'loading', points: [], error: null })
    getDhtHistory(range).then(points => {
      if (active) setState({ status: 'ready', points, error: null })
    }).catch(reason => {
      if (active) setState({
        status: 'error',
        points: [],
        error: reason instanceof Error ? reason.message : 'Gagal memuat riwayat sensor.',
      })
    })
    return () => { active = false }
  }, [range])

  return state
}
