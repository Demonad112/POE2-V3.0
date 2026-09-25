'use client'

/**
 * Load Path of Building's base-item data on demand, for the alternative-bases
 * table in the replacement planner.
 *
 * Unlike useModTiers this is called from each open planner, so the fetch is
 * shared at module level: opening three planners costs one request.
 */

import { useEffect, useState } from 'react'
import { BaseCatalog, type BaseData } from '@poe2/core'

const DATA_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/bases.json`

export type BaseCatalogState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; catalog: BaseCatalog }
  | { status: 'error'; message: string }

let shared: Promise<BaseCatalog> | null = null

function load(): Promise<BaseCatalog> {
  shared ??= fetch(DATA_URL)
    .then(async (res) => {
      if (!res.ok) throw new Error(`the base-item data returned ${res.status}`)
      return new BaseCatalog((await res.json()) as BaseData)
    })
    .catch((err: Error) => {
      // Let a later open retry rather than caching the failure for the session.
      shared = null
      throw err
    })
  return shared
}

export function useBaseCatalog(enabled: boolean): BaseCatalogState {
  const [state, setState] = useState<BaseCatalogState>({ status: 'idle' })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off a fetch against an external system
    setState({ status: 'loading' })
    load()
      .then((catalog) => {
        if (!cancelled) setState({ status: 'ready', catalog })
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ status: 'error', message: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return state
}
