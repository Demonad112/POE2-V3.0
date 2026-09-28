'use client'

import { BASE_PATH } from './basePath'
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

/**
 * The in-app path that re-imports a poe.ninja character. Without the base
 * path: Next's <Link> adds that itself. Use `importUrl` for a link that leaves
 * the app.
 */
export function importPath(url: string): string {
  return `/character/?import=${encodeURIComponent(url)}`
}

/** The absolute, shareable form of `importPath`, base path included. */
export function importUrl(url: string, origin: string): string {
  return `${origin}${BASE_PATH}${importPath(url)}`
}

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
