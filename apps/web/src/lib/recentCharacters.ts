'use client'

import { createLocalStore } from './localStore'

/** A character imported from a poe.ninja URL, so it can be re-imported in one tap. */
export interface RecentCharacter {
  url: string
  /** `snapshotKey(identity)`, to find this character's history snapshots. */
  key: string
  name: string
  className: string | null
  level: number | null
  at: string
}

const MAX_RECENT = 5

export const recentCharacters = createLocalStore<RecentCharacter[]>(
  'poe2-endgame-companion:recent-characters:v1',
  [],
  (v) => Array.isArray(v) && v.every((r) => typeof r?.url === 'string' && typeof r?.key === 'string'),
)

/** Newest first, one row per character. */
export function recordRecent(entry: RecentCharacter): void {
  recentCharacters.set((prev) => {
    const same = prev[0]
    if (same && same.url === entry.url && same.key === entry.key && same.level === entry.level) return prev
    return [entry, ...prev.filter((r) => r.url !== entry.url && r.key !== entry.key)].slice(0, MAX_RECENT)
  })
}
