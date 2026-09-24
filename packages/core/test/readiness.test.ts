import { describe, expect, it } from 'vitest'
import { assessReadiness, latestSnapshot, type CharacterSnapshot } from '../src/progress/index.js'

function snap(overrides: Partial<CharacterSnapshot> = {}): CharacterSnapshot {
  return {
    at: '2026-09-24T00:00:00.000Z',
    updatedUtc: null,
    key: 'acct/char',
    level: 90,
    life: 5000,
    energyShield: 1000,
    ward: 0,
    armour: 0,
    evasion: 0,
    pool: 6000,
    ehp: 0,
    fire: 75,
    cold: 75,
    lightning: 75,
    chaos: 40,
    dps: 0,
    weakestHit: 0,
    passives: 100,
    ...overrides,
  }
}

describe('assessReadiness', () => {
  it('passes every milestone for a capped, levelled character', () => {
    const r = assessReadiness(snap())
    expect(r.ready).toEqual({ mapping: true, ascendancy: true, pinnacle: true })
    expect(r.checks.every((c) => c.pass)).toBe(true)
  })

  it('flags an uncapped element and blocks pinnacles with it', () => {
    const r = assessReadiness(snap({ lightning: 60 }))
    const lightning = r.checks.find((c) => c.id === 'lightning-res')!
    expect(lightning).toMatchObject({ pass: false, have: 60, need: 75 })
    expect(r.ready.mapping).toBe(false)
    expect(r.ready.pinnacle).toBe(false)
  })

  it('treats exactly 0% chaos as mapping-safe but short of the pinnacle target', () => {
    const r = assessReadiness(snap({ chaos: 0 }))
    expect(r.checks.find((c) => c.id === 'chaos-floor')!.pass).toBe(true)
    expect(r.checks.find((c) => c.id === 'chaos-target')!.pass).toBe(false)
    expect(r.ready.mapping).toBe(true)
    expect(r.ready.pinnacle).toBe(false)
  })

  it('separates the level gates', () => {
    const r = assessReadiness(snap({ level: 72, pool: 4000 }))
    expect(r.ready.ascendancy).toBe(true)
    expect(r.checks.find((c) => c.id === 'level-85')!.pass).toBe(false)
    expect(r.checks.find((c) => c.id === 'pool-pinnacle')!.pass).toBe(false)
  })
})

describe('latestSnapshot', () => {
  it('picks the newest across characters', () => {
    const a = snap({ at: '2026-09-20T00:00:00.000Z', key: 'a/one' })
    const b = snap({ at: '2026-09-23T00:00:00.000Z', key: 'b/two' })
    expect(latestSnapshot([b, a])?.key).toBe('b/two')
    expect(latestSnapshot([])).toBeNull()
  })
})
