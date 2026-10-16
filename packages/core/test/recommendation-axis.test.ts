import { describe, expect, it } from 'vitest'
import { axisOf, groupByAxis } from '../src/recommend/axis.js'
import type { Recommendation } from '../src/recommend/types.js'

function rec(category: Recommendation['category'], stat: string | null): Recommendation {
  return {
    id: `${category}-${stat}`,
    category,
    action: 'a',
    rationale: 'r',
    impact: stat ? { stat, label: stat, from: 1, to: 2, delta: 1, unit: 'flat', significance: 0.5 } : null,
    cost: { kind: 'free', amount: 0, detail: '' },
    tradeoff: null,
    evidence: [],
    provenance: 'ninja',
    score: 1,
  }
}

describe('recommendation axis', () => {
  it('takes the category when it already names a side', () => {
    expect(axisOf(rec('damage', 'hitChance'))).toBe('damage')
    expect(axisOf(rec('survivability', 'fireResistance'))).toBe('survivability')
  })

  it('reads gear recommendations from the stat they move', () => {
    expect(axisOf(rec('gear', 'fireResistance'))).toBe('survivability')
    expect(axisOf(rec('gear', 'coldResistanceOverCap'))).toBe('survivability')
    expect(axisOf(rec('gear', 'criticalStrikeMultiplier'))).toBe('damage')
  })

  it('does not guess for a stat it does not know, or no impact', () => {
    expect(axisOf(rec('gear', 'affixSlotsUsed'))).toBe('unclassified')
    expect(axisOf(rec('efficiency', 'anoints'))).toBe('unclassified')
    expect(axisOf(rec('question', null))).toBe('unclassified')
  })

  it('groups without dropping or reordering anything', () => {
    const all = [rec('gear', 'fireResistance'), rec('damage', 'hitChance'), rec('gear', 'affixSlotsUsed'), rec('survivability', 'armour')]
    const g = groupByAxis(all)
    expect(g.survivability.map((r) => r.id)).toEqual(['gear-fireResistance', 'survivability-armour'])
    expect(g.damage).toHaveLength(1)
    expect(g.unclassified).toHaveLength(1)
    expect(g.damage.length + g.survivability.length + g.unclassified.length).toBe(all.length)
  })
})
