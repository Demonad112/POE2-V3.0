import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { unwrapCharModel } from '../src/analyze.js'
import { analyzeDefense } from '../src/defense/index.js'
import { impliedResistance, impliedResistances } from '../src/defense/implied.js'

describe('impliedResistance (pool / (1 - resistance))', () => {
  it('inverts the formula within integer rounding', () => {
    // 1,721 pool against 6,146 / 5,062 / 6,374: the Yykiuy evidence pack.
    expect(impliedResistance(1721, 6146)).toEqual({ min: 72, max: 72 })
    expect(impliedResistance(1721, 5062)).toEqual({ min: 66, max: 66 })
    expect(impliedResistance(1721, 6374)).toEqual({ min: 73, max: 73 })
  })

  it('widens to a range for small hits, where rounding matters', () => {
    const r = impliedResistance(100, 400)!
    expect(r.min).toBeLessThan(75)
    expect(r.max).toBeGreaterThan(75)
  })

  it('is null for non-positive inputs', () => {
    expect(impliedResistance(0, 100)).toBeNull()
    expect(impliedResistance(100, 0)).toBeNull()
  })
})

describe('impliedResistances', () => {
  const yykiuy = {
    life: 1111,
    energyShield: 610,
    physicalMaxHit: 1721,
    maxHits: { fire: 6146, cold: 5062, lightning: 6374 },
    displayed: { fire: 75, cold: 69, lightning: 76 },
  }

  it('reports the gap to the displayed resistance as a range (about 3 points)', () => {
    const r = impliedResistances(yykiuy)
    expect(r.map((x) => [x.type, x.status])).toEqual([['fire', 'implied'], ['cold', 'implied'], ['lightning', 'implied']])
    for (const x of r) expect(x.gap).toEqual({ min: 3, max: 3 })
  })

  it('refuses to infer when other mitigation applies, saying why', () => {
    const r = impliedResistances({ ...yykiuy, physicalMaxHit: 4264 })
    for (const x of r) {
      expect(x.status).toBe('unknown')
      expect(x.implied).toBeNull()
      expect(x.reason).toMatch(/other mitigation/)
    }
  })

  it('is unknown when life or ES is not reported', () => {
    expect(impliedResistances({ ...yykiuy, life: null }).every((x) => x.status === 'unknown')).toBe(true)
  })

  it('does not infer on the recorded fixture, whose physical hit is not its pool', () => {
    const model = unwrapCharModel(
      JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/athrynas-v43.json', import.meta.url)), 'utf8')),
    )
    const d = analyzeDefense(model)
    expect(d.impliedResistances.every((x) => x.status === 'unknown')).toBe(true)
  })

  it('reads through analyzeDefense when the pool is exactly life + ES', () => {
    const d = analyzeDefense({
      defensiveStats: {
        life: 1111,
        energyShield: 610,
        physicalMaximumHitTaken: 1721,
        fireMaximumHitTaken: 6146,
        coldMaximumHitTaken: 5062,
        lightningMaximumHitTaken: 6374,
        fireResistance: 75,
        coldResistance: 69,
        lightningResistance: 76,
      },
    })
    expect(d.impliedResistances.map((x) => x.implied)).toEqual([
      { min: 72, max: 72 },
      { min: 66, max: 66 },
      { min: 73, max: 73 },
    ])
  })
})
