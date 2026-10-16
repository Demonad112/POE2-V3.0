import { describe, expect, it } from 'vitest'
import { analyzeDefense, resistanceShortfalls } from '../src/defense/index.js'
import { effectivePool } from '../src/keystones/index.js'
import { assessReadiness, diffSnapshots, compareSnapshots, migrateSnapshots, type CharacterSnapshot } from '../src/progress/index.js'
import { assessBuild } from '../src/score/index.js'

const empty = analyzeDefense({ defensiveStats: {} })

function snap(over: Partial<CharacterSnapshot> = {}): CharacterSnapshot {
  return {
    at: '2026-01-01T00:00:00Z',
    updatedUtc: null,
    key: 'a/b',
    level: 90,
    life: 1000,
    energyShield: 500,
    ward: 0,
    armour: 0,
    evasion: 0,
    pool: 1500,
    ehp: 3000,
    fire: 75,
    cold: 75,
    lightning: 75,
    chaos: 0,
    dps: 1000,
    weakestHit: 2000,
    passives: 100,
    ...over,
  }
}

describe('unknown figures are null, never 0 (B-1, B-2, B-3)', () => {
  it('B-1: missing resistances are null and are not a shortfall', () => {
    for (const r of empty.resistances) {
      expect(r.value).toBeNull()
      expect(r.underCap).toBeNull()
      expect(r.overCap).toBeNull()
      expect(r.capped).toBeNull()
    }
    expect(resistanceShortfalls(empty)).toEqual([])
    expect(empty.missing).toContain('fireResistance')
  })

  it('B-1: a known 0% resistance is still a real shortfall', () => {
    const d = analyzeDefense({ defensiveStats: { fireResistance: 0 } })
    expect(resistanceShortfalls(d).map((r) => r.type)).toEqual(['fire'])
  })

  it('B-1: the build score does not list unknown resistances as uncapped', () => {
    const a = assessBuild({ defense: empty, dps: { primary: null } as never })
    expect(a.weaknesses.map((w) => w.text).join('|')).not.toMatch(/Uncapped elemental/)
    expect(a.caveats.join('|')).toMatch(/not in the payload/)
  })

  it('B-2: missing life and energy shield are null and the pool is unknown', () => {
    expect(empty.life).toBeNull()
    expect(empty.energyShield).toBeNull()
    expect(empty.chaosRawPool).toBeNull()
    expect(effectivePool(empty).total).toBeNull()
    const a = assessBuild({ defense: empty, dps: { primary: null } as never })
    expect(a.pool.total).toBeNull()
    expect(a.weaknesses.map((w) => w.text).join('|')).not.toMatch(/Thin defensive pool/)
  })

  it('B-3: diffing a partial snapshot against a full one reports no gains', () => {
    const partial = snap({ life: null, energyShield: null, pool: null, fire: null, dps: null, weakestHit: null })
    const d = diffSnapshots(partial, snap())
    expect(d.changes.map((c) => c.field)).toEqual([])
    expect(d.newlyCapped).toEqual([])
  })

  it('B-3: compare shows null as missing', () => {
    const rows = compareSnapshots(snap({ life: null }), snap())
    const life = rows.find((r) => r.metric === 'life')!
    expect(life.a).toBeNull()
    expect(life.delta).toBeNull()
    expect(life.ahead).toBeNull()
  })

  it('B-3: readiness is unknown, not failed, when a figure is null', () => {
    const r = assessReadiness(snap({ fire: null }))
    expect(r.checks.find((c) => c.id === 'fire-res')!.pass).toBeNull()
    expect(r.ready.mapping).toBeNull()
  })

  it('B-3: stored snapshots with null figures survive migration', () => {
    const m = migrateSnapshots([snap({ life: null, fire: null })])
    expect(m.dropped).toBe(0)
    expect(m.snapshots[0]!.life).toBeNull()
  })
})
