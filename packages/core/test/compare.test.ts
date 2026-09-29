/**
 * Comparing two characters: raw figures side by side, nothing blended, and a
 * figure one side never reported shown as missing rather than as a loss.
 */
import { describe, expect, it } from 'vitest'
import { compareSnapshots, type CharacterSnapshot } from '../src/progress/index.js'

const snap = (over: Partial<CharacterSnapshot>): CharacterSnapshot => ({
  at: '2026-09-28T00:00:00Z',
  updatedUtc: null,
  key: 'acc/A',
  level: 90,
  life: 1500,
  energyShield: 2000,
  ward: 0,
  armour: 0,
  evasion: 0,
  pool: 3500,
  ehp: 9000,
  fire: 75,
  cold: 75,
  lightning: 75,
  chaos: 20,
  dps: 100_000,
  weakestHit: 4000,
  passives: 110,
  ...over,
})

describe('compareSnapshots', () => {
  it('lines figures up and says which side is ahead', () => {
    const rows = compareSnapshots(snap({}), snap({ key: 'acc/B', life: 2500, chaos: 10 }))
    const by = Object.fromEntries(rows.map((r) => [r.metric, r]))
    expect(by.life).toMatchObject({ a: 1500, b: 2500, delta: 1000, ahead: 'b' })
    expect(by.chaos).toMatchObject({ a: 20, b: 10, delta: -10, ahead: 'a' })
    expect(by.fire).toMatchObject({ delta: 0, ahead: 'even' })
  })

  it('treats an unreported DPS or max hit as missing, not as zero', () => {
    const rows = compareSnapshots(snap({ dps: 0 }), snap({ weakestHit: 0 }))
    const by = Object.fromEntries(rows.map((r) => [r.metric, r]))
    expect(by.dps).toMatchObject({ a: null, b: 100_000, delta: null, ahead: null })
    expect(by.weakestHit).toMatchObject({ a: 4000, b: null, delta: null, ahead: null })
  })

  it('keeps a real zero where zero is meaningful', () => {
    // Chaos Inoculation: life is genuinely 1-ish, energy shield can be 0 on a life build.
    const rows = compareSnapshots(snap({ energyShield: 0 }), snap({}))
    expect(rows.find((r) => r.metric === 'energyShield')).toMatchObject({ a: 0, b: 2000, ahead: 'b' })
  })
})
