import { describe, expect, it } from 'vitest'
import { itemWarnings, modWarnings, supportWarnings } from '../src/warnings/index.js'

const rare = { name: 'Doom Coil', baseType: 'Ring', rarity: 'Rare' }
const unique = { name: 'Some Unique', baseType: 'Ring', rarity: 'Unique' }
const charm = { name: 'Sprouting Staunching Charm of the Constant', baseType: 'Staunching Charm', rarity: 'Magic' }

describe('card warnings', () => {
  it('flags a charm-only mod on a non-charm item, not on the charm itself', () => {
    const line = '20% increased Charm Effect Duration'
    expect(modWarnings(line, rare).map((w) => w.kind)).toEqual(['charm-dependent'])
    expect(modWarnings(line, charm)).toEqual([])
  })

  it('flags a conditional mod and adds a unique caveat only on uniques', () => {
    const line = '30% increased Damage while you have a Totem'
    expect(modWarnings(line, rare).map((w) => w.kind)).toEqual(['conditional'])
    expect(modWarnings(line, unique).map((w) => w.kind)).toEqual(['conditional', 'unique-uncertain'])
  })

  it('stays silent on a plain mod and labels every warning rule-based with its source', () => {
    expect(modWarnings('+40 to maximum Life', rare)).toEqual([])
    const w = modWarnings('20% increased Charm Effect Duration', rare)[0]!
    expect(w.basis).toBe('rule-based')
    expect(w.source).toBe('20% increased Charm Effect Duration')
  })

  it('collects warnings over every line of an item', () => {
    const w = itemWarnings({ ...rare, mods: ['+40 to maximum Life', '10% increased Damage recently', 'Charm slots'] })
    expect(w.map((x) => x.kind)).toEqual(['conditional', 'charm-dependent'])
  })

  it('flags a minion support from its tags or stats, and not a plain one', () => {
    expect(supportWarnings({ name: 'Minion Damage', tags: ['Minion'], stats: [] })).toHaveLength(1)
    expect(supportWarnings({ name: 'X', tags: [], stats: ['Minions deal 20% more damage'] })).toHaveLength(1)
    expect(supportWarnings({ name: 'Added Fire', tags: ['Attack'], stats: ['Adds fire damage'] })).toEqual([])
  })
})
