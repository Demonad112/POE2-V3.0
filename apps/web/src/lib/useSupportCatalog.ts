'use client'

/**
 * Load Path of Building's support-gem data on demand, for the damage review.
 *
 * Same pattern as useModTiers: fetched only once a character is loaded, so a
 * reader who never opens the review doesn't pay for it up front.
 */

import { useEffect, useState } from 'react'
import { SupportCatalog, type PobSkillData } from '@poe2/core'

const DATA_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/pob-skills.json`

export type SupportCatalogState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; catalog: SupportCatalog }
  | { status: 'error'; message: string }

export function useSupportCatalog(enabled: boolean): SupportCatalogState {
  const [state, setState] = useState<SupportCatalogState>({ status: 'idle' })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off a fetch against an external system
    setState({ status: 'loading' })

    fetch(DATA_URL)
      .then(async (res) => {
        if (!res.ok) throw new Error(`the support-gem data returned ${res.status}`)
        return (await res.json()) as PobSkillData
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', catalog: new SupportCatalog(data) })
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
