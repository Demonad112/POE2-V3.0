import { describe, expect, it } from 'vitest'
import type { ReplacementPlan } from '@poe2/core'
import { addEntry, entryFromPlan, removeEntry, shoppingList, toggleEntry } from '../src/lib/shoppingList'
import { defaultState } from '../src/lib/storage'

const plan = {
  slotId: 1,
  slotLabel: 'Helmet',
  itemName: 'Hypnotic Halo',
  baseType: 'Jungle Tiara',
  rarity: 'Rare',
  ilvlNeeded: 81,
  spec: [
    { kind: 'suffix', statId: 'base_cold_damage_resistance_%', text: '+(41-45)% to Cold Resistance', affix: 'of the Tundra', tier: 1, tiers: 8, ilvl: 71, min: 41, max: 45, current: 35, why: 'needed-resistance' },
  ],
  dropped: [],
  resistances: [],
  followUps: [
    { step: 1, type: 'cold', slotLabel: 'Body Armour', itemName: 'Viper Hide', action: 'upgrade-tier', from: { text: '+26% to Cold Resistance', tier: 4, value: 26 }, to: { text: null, affix: null, tier: 1, min: 41, max: 45, ilvl: 71 }, closes: 15, note: '' },
  ],
  uncovered: [],
  existingShortfalls: [],
  notes: [],
} as unknown as ReplacementPlan

describe('shopping list', () => {
  it('snapshots a plan as text', () => {
    const e = entryFromPlan(plan, 'Athrynas', new Date('2026-09-25T00:00:00Z'))
    expect(e).toMatchObject({ characterName: 'Athrynas', slotLabel: 'Helmet', baseType: 'Jungle Tiara', ilvlNeeded: 81, done: false })
    expect(e.lines).toEqual(['T1 +(41-45)% to Cold Resistance'])
    expect(e.followUps[0]).toMatch(/Viper Hide \(Body Armour\): cold resistance T4 26% → T1 41–45%/)
  })

  it('works on a payload saved before the list existed', () => {
    const old = defaultState()
    expect(old.gear).toBeUndefined()
    expect(shoppingList(old)).toEqual([])
    const next = addEntry(old, entryFromPlan(plan, 'Athrynas'))
    expect(shoppingList(next)).toHaveLength(1)
    // Nothing else in the saved state is touched.
    expect(next.checklist).toBe(old.checklist)
    expect(next.character).toBe(old.character)
  })

  it('replaces an older plan for the same character and slot', () => {
    const first = addEntry(defaultState(), entryFromPlan(plan, 'Athrynas', new Date(1)))
    const second = addEntry(first, entryFromPlan(plan, 'Athrynas', new Date(2)))
    const other = addEntry(second, entryFromPlan(plan, 'Someone Else', new Date(3)))
    expect(shoppingList(second)).toHaveLength(1)
    expect(shoppingList(second)[0]!.createdAt).toBe(new Date(2).toISOString())
    expect(shoppingList(other)).toHaveLength(2)
  })

  it('ticks off and removes by id', () => {
    const s = addEntry(defaultState(), entryFromPlan(plan, 'Athrynas'))
    const id = shoppingList(s)[0]!.id
    expect(shoppingList(toggleEntry(s, id))[0]!.done).toBe(true)
    expect(shoppingList(removeEntry(s, id))).toEqual([])
  })
})
