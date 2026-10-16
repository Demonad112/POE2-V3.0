/**
 * Versioned snapshot storage.
 *
 * Schema 1 snapshots carried no version field. Schema 2 adds `schema`, so a
 * later change to the shape can be recognised and migrated instead of the
 * whole persisted state being discarded.
 *
 * `migrateSnapshots` is total: it never throws, drops rows it cannot read
 * (counting them), is idempotent, and passes rows from a newer schema through
 * untouched rather than rewriting something it does not understand.
 */

import type { CharacterSnapshot } from './index.js'

export const SNAPSHOT_SCHEMA = 2

const NUMERIC_FIELDS = [
  'level',
  'life',
  'energyShield',
  'ward',
  'armour',
  'evasion',
  'pool',
  'ehp',
  'fire',
  'cold',
  'lightning',
  'chaos',
  'dps',
  'weakestHit',
  'passives',
] as const

const NULLABLE_FIELDS: ReadonlySet<string> = new Set([
  'level',
  'life',
  'energyShield',
  'pool',
  'ehp',
  'fire',
  'cold',
  'lightning',
  'chaos',
  'dps',
  'weakestHit',
])

function readable(row: unknown): row is Record<string, unknown> {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false
  const r = row as Record<string, unknown>
  if (typeof r.at !== 'string' || typeof r.key !== 'string' || r.key === '') return false
  if (r.updatedUtc !== null && typeof r.updatedUtc !== 'string') return false
  // A figure the source did not report is stored as null (never 0), so null is readable
  // for every field that may be unknown. Legacy rows hold 0 there and are left as written.
  return NUMERIC_FIELDS.every((f) =>
    r[f] === null && NULLABLE_FIELDS.has(f) ? true : typeof r[f] === 'number' && Number.isFinite(r[f]),
  )
}

export interface SnapshotMigration {
  snapshots: CharacterSnapshot[]
  /** Rows that were not usable and were left out. */
  dropped: number
  /** Rows that were upgraded from an older schema. */
  upgraded: number
}

export function migrateSnapshots(raw: unknown): SnapshotMigration {
  if (!Array.isArray(raw)) return { snapshots: [], dropped: raw === undefined || raw === null ? 0 : 1, upgraded: 0 }

  const snapshots: CharacterSnapshot[] = []
  let dropped = 0
  let upgraded = 0
  for (const row of raw) {
    if (!readable(row)) {
      dropped += 1
      continue
    }
    const schema = typeof row.schema === 'number' ? row.schema : 1
    if (schema > SNAPSHOT_SCHEMA) {
      snapshots.push(row as unknown as CharacterSnapshot)
      continue
    }
    if (schema < SNAPSHOT_SCHEMA) upgraded += 1
    snapshots.push({ ...(row as unknown as CharacterSnapshot), schema: SNAPSHOT_SCHEMA })
  }
  return { snapshots, dropped, upgraded }
}
