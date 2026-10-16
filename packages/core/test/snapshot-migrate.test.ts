import { describe, expect, it } from 'vitest'
import { appendSnapshot, migrateSnapshots, SNAPSHOT_SCHEMA, type CharacterSnapshot } from '../src/progress/index.js'

const v1 = {
  at: '2026-10-01T00:00:00.000Z',
  updatedUtc: null,
  key: 'acct/Char',
  level: 90,
  life: 3000,
  energyShield: 500,
  ward: 0,
  armour: 100,
  evasion: 2000,
  pool: 3500,
  ehp: 9000,
  fire: 75,
  cold: 74,
  lightning: 75,
  chaos: -20,
  dps: 100000,
  weakestHit: 4000,
  passives: 100,
}

describe('migrateSnapshots', () => {
  it('upgrades unversioned rows and stamps the schema', () => {
    const r = migrateSnapshots([v1])
    expect(r).toMatchObject({ dropped: 0, upgraded: 1 })
    expect(r.snapshots[0]).toEqual({ ...v1, schema: SNAPSHOT_SCHEMA })
  })

  it('is idempotent', () => {
    const once = migrateSnapshots([v1])
    const twice = migrateSnapshots(once.snapshots)
    expect(twice.snapshots).toEqual(once.snapshots)
    expect(twice.upgraded).toBe(0)
  })

  it('drops malformed rows and counts them, never throwing', () => {
    const r = migrateSnapshots([v1, null, 'x', [], { ...v1, life: 'many' }, { ...v1, key: '' }, { ...v1, life: Number.NaN }])
    expect(r.snapshots).toHaveLength(1)
    expect(r.dropped).toBe(6)
  })

  it('handles non-array input', () => {
    expect(migrateSnapshots(undefined)).toEqual({ snapshots: [], dropped: 0, upgraded: 0 })
    expect(migrateSnapshots({ not: 'an array' })).toEqual({ snapshots: [], dropped: 1, upgraded: 0 })
  })

  it('passes rows from a newer schema through untouched', () => {
    const future = { ...v1, schema: SNAPSHOT_SCHEMA + 1, extra: true }
    expect(migrateSnapshots([future]).snapshots[0]).toBe(future)
  })

  it('does not re-append an unchanged character just because it was upgraded', () => {
    const history = migrateSnapshots([v1]).snapshots
    const next: CharacterSnapshot = { ...v1, schema: SNAPSHOT_SCHEMA, at: '2026-10-02T00:00:00.000Z' }
    expect(appendSnapshot(history, next)).toBe(history)
    expect(appendSnapshot([v1 as CharacterSnapshot], next)).toHaveLength(1) // v1 row without schema vs stamped next
  })
})
