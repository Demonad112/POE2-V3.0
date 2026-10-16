import { describe, expect, it } from 'vitest'
import { slotsWithNoFlaggedUpgrade } from '../src/gear/no-upgrade.js'
import type { GearSwap, ItemAnalysis, ItemModAnalysis, UpgradeOption } from '../src/gear/analyze.js'
import type { Recommendation } from '../src/recommend/types.js'

function mod(over: Partial<ItemModAnalysis> = {}): ItemModAnalysis {
  return {
    id: 'm',
    source: 'explicit',
    kind: 'prefix',
    affix: null,
    text: 'x',
    tier: 1,
    tiers: 5,
    ilvlRequired: 1,
    rolled: [],
    upgrades: [],
    waste: null,
    unresolved: null,
    ...over,
  }
}

function item(slotId: number, mods: ItemModAnalysis[], active = true): ItemAnalysis {
  return {
    slotId,
    slotLabel: `slot${slotId}`,
    name: `item${slotId}`,
    baseType: 'b',
    itemClass: null,
    itemLevel: 80,
    rarity: 'Rare',
    corrupted: false,
    active,
    mods,
    affixCounts: { prefix: 1, suffix: 0 },
    tierProfile: null,
    warnings: [],
  }
}

const better: UpgradeOption = { tier: 1, ilvl: 80, affix: null, text: null, reachableOnThisItem: true, gain: 5, lowerIsBetter: false }

function recNaming(slotId: number): Recommendation {
  return {
    id: 'r',
    category: 'gear',
    action: 'a',
    rationale: 'r',
    impact: null,
    cost: { kind: 'gear', amount: 1, detail: '' },
    tradeoff: null,
    evidence: [{ kind: 'item', slotId, slotLabel: 's', itemName: 'i', note: 'n' }],
    provenance: 'ninja',
    score: 1,
  }
}

describe('slotsWithNoFlaggedUpgrade', () => {
  it('lists a clean graded slot as nothing flagged', () => {
    const v = slotsWithNoFlaggedUpgrade([item(1, [mod()])], [])
    expect(v).toHaveLength(1)
    expect(v[0]!.status).toBe('nothing-flagged')
  })

  it('does not list a slot with a better tier or wasted points', () => {
    const items = [item(1, [mod({ upgrades: [better] })]), item(2, [mod({ waste: { amount: 3, stat: 's', reason: 'r' } })])]
    expect(slotsWithNoFlaggedUpgrade(items, [])).toEqual([])
  })

  it('does not list a slot a recommendation or swap names', () => {
    const items = [item(1, [mod()]), item(2, [mod()])]
    const swap = { slotId: 2 } as GearSwap
    expect(slotsWithNoFlaggedUpgrade(items, [recNaming(1)], [swap])).toEqual([])
  })

  it('marks an ungradable slot not-evaluated rather than clean', () => {
    const v = slotsWithNoFlaggedUpgrade([item(1, [mod({ tier: null })])], [])
    expect(v[0]!.status).toBe('not-evaluated')
  })

  it('skips inactive weapon-set slots', () => {
    expect(slotsWithNoFlaggedUpgrade([item(1, [mod()], false)], [])).toEqual([])
  })
})
