import { describe, expect, it } from 'vitest'
import { analyzeDefense } from '../src/defense/index.js'
import { effectivePool } from '../src/keystones/index.js'
import { migrateSnapshots, toSnapshot } from '../src/progress/index.js'

describe('ward is unknown, not zero, when the payload omits it', () => {
  it('reads null when absent and the number when present, including a real 0', () => {
    expect(analyzeDefense({ defensiveStats: {} }).ward).toBeNull()
    expect(analyzeDefense({ defensiveStats: { ward: 706 } }).ward).toBe(706)
    expect(analyzeDefense({ defensiveStats: { ward: 0 } }).ward).toBe(0)
  })

  it('leaves the pool total to life and energy shield and does not list ward', () => {
    const p = effectivePool({ life: 1000, energyShield: 500, ward: null })
    expect(p.total).toBe(1500)
    expect(p.parts).toEqual(['life', 'energy shield'])
    const q = effectivePool({ life: 1000, energyShield: 500, ward: 200 })
    expect(q.total).toBe(1700)
    expect(q.parts).toContain('ward')
  })

  it('keeps an unknown pool unknown whatever the ward is', () => {
    expect(effectivePool({ life: null, energyShield: 500, ward: 200 }).total).toBeNull()
  })

  it('stores a null ward in the snapshot and reads it back through the migration', () => {
    const defense = analyzeDefense({ defensiveStats: { life: 1000 } })
    const snap = toSnapshot(
      { identity: { account: 'a', name: 'b', updatedUtc: null }, defense, dps: { primary: null }, passives: { counts: {}, mainSelectionLength: 0 } } as never,
      '2026-01-01T00:00:00Z',
    )
    expect(snap.ward).toBeNull()
    const m = migrateSnapshots([snap])
    expect(m.dropped).toBe(0)
    expect(m.snapshots[0]!.ward).toBeNull()
  })
})
