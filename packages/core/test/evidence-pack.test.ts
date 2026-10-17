/**
 * Regression tests for the two characters the analyzer was validated against.
 *
 * Both depend on a poe.ninja capture that is NOT in the repository yet. Until
 * the file is committed to test/fixtures/ the suite is skipped (pending), not
 * failing. Expected values come from the evidence pack: what this app read from
 * poe.ninja and the attached PoB export for that character. The reference
 * tool's different numbers (uncapped resistances +10, higher max hits) are
 * deliberately NOT asserted: they are hints to verify, not targets to match.
 *
 * Files to commit (stored verbatim, `{type, charModel}` envelope, see README):
 *   test/fixtures/yykiuy-v<model version>.json     level 63 Martial Artist
 *   test/fixtures/athrynas-94-v<model version>.json  level 94 Athrynas
 */

import { beforeAll, describe, expect, it } from 'vitest'
import type { Analysis } from '../src/analyze.js'
import { analyzeCharacter } from '../src/analyze.js'
import { checkBaseline, ninjaBaselineExpectations } from '../src/pob/baseline-gate.js'
import { analyzePob } from './helpers/pob.js'
import { findFixture } from './helpers/fixtures.js'

const yykiuy = findFixture(/^yykiuy.*\.json$/i)
const athrynas94 = findFixture(/^athrynas.*94.*\.json$/i)

describe.skipIf(!yykiuy)('Yykiuy (level 63 Martial Artist) evidence pack', () => {
  let a: Analysis
  const s = yykiuy?.model.defensiveStats ?? {}
  beforeAll(async () => {
    a = await analyzeCharacter(yykiuy!.raw)
  })

  it('reads the observed defensive stats', () => {
    expect(yykiuy!.model.level).toBe(63)
    expect(s.life).toBe(1111)
    expect(s.energyShield).toBe(610)
    expect(s.mana).toBe(731)
    expect(s.evasionRating).toBe(3790)
    expect([s.strength, s.dexterity, s.intelligence]).toEqual([95, 114, 96])
    expect(s.movementSpeed).toBe(30)
  })

  it('reads uncapped resistances as capped value plus over-cap', () => {
    const uncapped = Object.fromEntries(a.defense.resistances.map((r) => [r.type, (r.value ?? 0) + (r.overCap ?? 0)]))
    expect(uncapped).toEqual({ fire: 83, cold: 69, lightning: 84, chaos: 16 })
    expect(a.defense.resistances.map((r) => r.max)).toEqual([75, 75, 76, 75])
  })

  it('reads the maximum hits and EHP as given', () => {
    const hit = (t: string) => a.defense.maxHits.find((m) => m.type === t)?.value
    expect([hit('physical'), hit('chaos'), hit('fire'), hit('cold'), hit('lightning')]).toEqual([1721, 1686, 6146, 5062, 6374])
    expect(a.defense.effectiveHealthPool).toBe(3932)
  })

  it('reads Flicker Strike DPS and agrees with the export', async () => {
    const flicker = a.dps.skills.find((k) => k.name === 'Flicker Strike')
    expect(flicker?.dps).toBeGreaterThan(55_000)
    expect(flicker?.dps).toBeLessThan(56_000)
    const stats = await analyzePob(yykiuy!.model)
    expect(stats.TotalDPS).toBeCloseTo(55_513, -1)
  })

  it('the export’s own baseline reproduces poe.ninja, so simulation would be allowed', async () => {
    const stats = await analyzePob(yykiuy!.model)
    const gate = checkBaseline(ninjaBaselineExpectations(yykiuy!.model.defensiveStats), stats)
    expect(gate.failing.map((f) => f.reason)).toEqual([])
  })

  it('does not raise a banner for the unmapped stat id', () => {
    expect(a.warnings.join(' ')).not.toMatch(/disagree between poe.ninja/)
  })
})

describe.skipIf(!athrynas94)('Athrynas (level 94) evidence pack', () => {
  it('is a level 94 capture', () => {
    expect(athrynas94!.model.level).toBe(94)
  })
  it.todo('expected outputs: not in the evidence pack; record them from the committed capture')
})

// Visible in the run as pending until the captures are committed.
if (!yykiuy) it.todo('Yykiuy: commit test/fixtures/yykiuy-v<model version>.json (level 63 Martial Artist)')
if (!athrynas94) it.todo('Athrynas level 94: commit test/fixtures/athrynas-94-v<model version>.json')
