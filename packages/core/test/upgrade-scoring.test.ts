import { describe, expect, it } from 'vitest'
import { combineScores, scoreUpgrade, type ScoreProfile } from '../src/upgrade/scoring.js'

const base: ScoreProfile = { dps: 100_000, lowestMaxHit: 4_000, ehp: 12_000, movementSpeed: 130, aoeRadius: 20 }
const value = (r: ReturnType<typeof scoreUpgrade>) => {
  if (r.kind !== 'point') throw new Error(`expected point, got ${r.kind}`)
  return r.value
}

describe('scoreUpgrade', () => {
  it('scores 0 when nothing changes', () => {
    expect(value(scoreUpgrade(base, base, { mode: 'bossing' }))).toBeCloseTo(0, 12)
    expect(value(scoreUpgrade(base, base, { mode: 'mapping' }))).toBeCloseTo(0, 12)
  })

  it('is monotonic in damage, max hit, EHP, movement speed and area', () => {
    for (const mode of ['mapping', 'bossing'] as const) {
      const ref = value(scoreUpgrade(base, base, { mode }))
      const keys = mode === 'mapping' ? (['dps', 'lowestMaxHit', 'ehp', 'movementSpeed', 'aoeRadius'] as const) : (['dps', 'lowestMaxHit', 'ehp'] as const)
      for (const k of keys) {
        const up = value(scoreUpgrade(base, { ...base, [k]: (base[k] as number) * 1.1 }, { mode }))
        const down = value(scoreUpgrade(base, { ...base, [k]: (base[k] as number) * 0.9 }, { mode }))
        expect(up).toBeGreaterThan(ref)
        expect(down).toBeLessThan(ref)
      }
    }
  })

  it('bossing ignores clear speed', () => {
    const r = scoreUpgrade(base, { ...base, movementSpeed: 200 }, { mode: 'bossing' })
    expect(r.kind === 'point' && r.value).toBeCloseTo(0, 12)
  })

  it('adds multiplicative gains', () => {
    const a = scoreUpgrade(base, { ...base, dps: 110_000 }, { mode: 'bossing' })
    const b = scoreUpgrade(base, { ...base, ehp: 13_200 }, { mode: 'bossing' })
    const both = scoreUpgrade(base, { ...base, dps: 110_000, ehp: 13_200 }, { mode: 'bossing' })
    expect(value(both)).toBeCloseTo(value(a) + value(b), 12)
  })

  it('bossing weights the max hit more than mapping does', () => {
    const hitUp = { ...base, lowestMaxHit: 8_000 }
    expect(value(scoreUpgrade(base, hitUp, { mode: 'bossing' }))).toBeGreaterThan(
      value(scoreUpgrade(base, hitUp, { mode: 'mapping' })),
    )
  })

  it('priority shifts weight between damage and survivability', () => {
    const dmg = { ...base, dps: 150_000 }
    const s = (p: 'damage' | 'defence') => value(scoreUpgrade(base, dmg, { mode: 'bossing', priority: p }))
    expect(s('damage')).toBeGreaterThan(s('defence'))
  })

  it('lists clear speed as unscored when movement or area is missing', () => {
    const r = scoreUpgrade({ ...base, aoeRadius: null }, { ...base, aoeRadius: null }, { mode: 'mapping' })
    expect(r.kind).toBe('point')
    expect(r.unscored.join(' ')).toMatch(/clear speed/)
    expect(r.parts.some((p) => p.component === 'clear')).toBe(false)
  })

  it('returns a range when a component is an interval', () => {
    const r = scoreUpgrade(base, { ...base, dps: { min: 105_000, max: 125_000 } }, { mode: 'bossing' })
    expect(r.kind).toBe('range')
    if (r.kind === 'range') {
      expect(r.min).toBeLessThan(r.max)
      expect(r.min).toBeGreaterThan(0)
    }
  })

  it('returns unknown, not a number, when damage is missing', () => {
    const r = scoreUpgrade({ ...base, dps: null }, base, { mode: 'bossing' })
    expect(r.kind).toBe('unknown')
    if (r.kind === 'unknown') {
      expect(r.reason).toMatch(/damage/)
      expect(r.knownPart).not.toBeNull()
    }
  })

  it('returns unknown with no known part when nothing is usable', () => {
    const none: ScoreProfile = { dps: null, lowestMaxHit: null, ehp: null }
    const r = scoreUpgrade(none, none, { mode: 'bossing' })
    expect(r).toMatchObject({ kind: 'unknown', knownPart: null })
  })

  it('treats zero, negative and NaN figures as unknown', () => {
    for (const bad of [0, -5, Number.NaN, Infinity]) {
      expect(scoreUpgrade({ ...base, dps: bad }, base, { mode: 'bossing' }).kind).toBe('unknown')
    }
  })
})

describe('combineScores', () => {
  it('sums points and says it was not jointly simulated', () => {
    const a = scoreUpgrade(base, { ...base, dps: 110_000 }, { mode: 'bossing' })
    const b = scoreUpgrade(base, { ...base, ehp: 13_200 }, { mode: 'bossing' })
    const c = combineScores([a, b])
    expect(c.jointlySimulated).toBe(false)
    expect(c.result.kind).toBe('point')
    if (c.result.kind === 'point') expect(c.result.value).toBeCloseTo(value(a) + value(b), 12)
  })

  it('stays unknown if any input is unknown, keeping the known part', () => {
    const a = scoreUpgrade(base, { ...base, dps: 110_000 }, { mode: 'bossing' })
    const u = scoreUpgrade({ ...base, dps: null }, base, { mode: 'bossing' })
    const c = combineScores([a, u]).result
    expect(c.kind).toBe('unknown')
  })
})
