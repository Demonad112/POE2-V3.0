'use client'

import { useCallback, useMemo } from 'react'
import {
  EMPTY_DRAFT,
  anchorDraft,
  draftSize,
  restoreDraft,
  type GearDraft,
  type ItemAnalysis,
  type ModTiers,
  type SavedDraft,
} from '@poe2/core'
import { createLocalStore, useLocalStore } from './localStore'

type SavedDrafts = Record<string, SavedDraft & { savedAt: string }>

const MAX_CHARACTERS = 10

const drafts = createLocalStore<SavedDrafts>(
  'poe2-endgame-companion:gear-drafts:v1',
  {},
  (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
)

/**
 * The workbench draft, saved per character so a reload or a re-import keeps
 * it. Restoring re-checks every edit against the gear now equipped: an edit
 * whose line changed in game is dropped rather than applied to whatever moved
 * into its place, and `dropped` says how many went.
 */
export function useGearDraft(characterName: string, items: ItemAnalysis[] | null, tiers: ModTiers | null) {
  const saved = useLocalStore(drafts)[characterName]

  const { draft, dropped } = useMemo(() => {
    if (!saved || !items || !tiers) return { draft: EMPTY_DRAFT, dropped: 0 }
    return restoreDraft(items, saved, tiers)
  }, [saved, items, tiers])

  const setDraft = useCallback(
    (next: GearDraft) => {
      if (!items) return
      drafts.set((prev) => {
        const rest = { ...prev }
        delete rest[characterName]
        if (draftSize(next) === 0) return rest
        // Newest last; drop the oldest characters beyond the cap.
        const kept = Object.entries(rest).slice(-(MAX_CHARACTERS - 1))
        return {
          ...Object.fromEntries(kept),
          [characterName]: { ...anchorDraft(items, next), savedAt: new Date().toISOString() },
        }
      })
    },
    [characterName, items],
  )

  return { draft, setDraft, dropped }
}
