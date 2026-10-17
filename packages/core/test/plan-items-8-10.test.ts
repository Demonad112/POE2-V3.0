import { describe, expect, it } from 'vitest'
import { changedSinceLastReport } from '../src/progress/changed.js'
import type { CharacterSnapshot } from '../src/progress/index.js'
import { focusView } from '../src/recommend/focus.js'
import { duplicateFamilyNotes } from '../src/recommend/damage.js'
import type { Recommendation } from '../src/recommend/types.js'
import type { PobSupport } from '../src/gems/catalog.js'

function snap(at: string, over: Partial<CharacterSnapshot> = {}): CharacterSnapshot {
  return {
    at,
    updatedUtc: null,
    key: 'a/b',
    level: 90,
    life: 3000,
    energyShield: null,
    ward: 0,
    armour: 0,
    evasion: 0,
    pool: null,
    ehp: null,
    fire: 75,
    cold: 75,
    lightning: 70,
    chaos: null,
    dps: 1000,
    weakestHit: null,
    passives: 100,
    ...over,
  }
}

describe('changedSinceLastReport (item 9)', () => {
  it('is unavailable, not "unchanged", with fewer than two snapshots', () => {
    const r = changedSinceLastReport([snap('2026-01-01T00:00:00Z')], 'a/b')
    expect(r.available).toBe(false)
    expect(r.unchanged).toBe(false)
    expect(r.since).toBeNull()
  })

  it('splits improved from worsened and reports cap crossings', () => {
    const r = changedSinceLastReport(
      [snap('2026-01-01T00:00:00Z'), snap('2026-01-02T00:00:00Z', { life: 3500, dps: 900, lightning: 75 })],
      'a/b',
    )
    expect(r.available).toBe(true)
    expect(r.improved.map((c) => c.field)).toContain('life')
    expect(r.worsened.map((c) => c.field)).toEqual(['dps'])
    expect(r.newlyCapped).toEqual(['Lightning'])
    expect(r.since).toBe('2026-01-01T00:00:00Z')
  })

  it('does not count another character\'s snapshots', () => {
    const other = snap('2026-01-02T00:00:00Z', { key: 'x/y', life: 1 })
    expect(changedSinceLastReport([snap('2026-01-01T00:00:00Z'), other], 'a/b').available).toBe(false)
  })
})

function rec(id: string, category: Recommendation['category'], score: number): Recommendation {
  return {
    id,
    category,
    action: 'a',
    rationale: 'r',
    impact: null,
    cost: { kind: 'free', amount: 0, detail: '' },
    tradeoff: null,
    evidence: [],
    provenance: 'ninja',
    score,
  }
}

describe('focusView (item 8)', () => {
  const recs = [rec('d', 'damage', 1.0), rec('s', 'survivability', 0.95), rec('e', 'efficiency', 0.5)]

  it('leaves the default order untouched and does not mutate the input', () => {
    const before = recs.map((r) => r.id)
    expect(focusView(recs, null).map((r) => r.id)).toEqual(before)
    expect(recs.map((r) => r.id)).toEqual(before)
  })

  it('moves survivability up for bossing and damage up for mapping, without rescoring', () => {
    expect(focusView(recs, 'bossing').map((r) => r.id)).toEqual(['s', 'd', 'e'])
    expect(focusView(recs, 'mapping')[0]!.id).toBe('d')
    expect(focusView(recs, 'bossing').every((r) => recs.includes(r))).toBe(true)
  })
})

function support(name: string, family: string[]): PobSupport {
  return { id: name, name, description: null, family, require: [], exclude: [], lineage: false, tier: 1, effects: [], flags: [] }
}

describe('duplicateFamilyNotes (item 10)', () => {
  it('names the gem already used and the others of its family, and nothing else', () => {
    const used = new Map([['Brutality', 'Brutality I']])
    const notes = duplicateFamilyNotes(
      [support('Brutality I', ['Brutality']), support('Brutality II', ['Brutality']), support('Other', ['Other'])],
      used,
    )
    expect(notes).toHaveLength(1)
    expect(notes[0]).toContain('You already use Brutality I')
    expect(notes[0]).toContain('Brutality II')
    expect(notes[0]).not.toContain('Other')
  })

  it('is empty when no family is already used', () => {
    expect(duplicateFamilyNotes([support('X', ['F'])], new Map())).toEqual([])
  })
})
