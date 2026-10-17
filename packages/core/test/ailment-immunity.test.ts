import { describe, expect, it } from 'vitest'
import { ailmentImmunities } from '../src/defense/ailments.js'

const item = (slotLabel: string, mods: string[], active = true) => ({ slotLabel, name: `${slotLabel} item`, mods, active })

describe('ailmentImmunities', () => {
  it('reports unknown, never exposed, when no item says anything', () => {
    const r = ailmentImmunities([item('Helmet', ['+40 to maximum Life'])])
    expect(r).toHaveLength(7)
    expect(r.every((a) => a.status === 'unknown')).toBe(true)
  })

  it('finds explicit immunity text and names the source line', () => {
    const r = ailmentImmunities([item('Boots', ['Cannot be Frozen']), item('Helmet', ['Immune to Ignite'])])
    const freeze = r.find((a) => a.ailment === 'freeze')!
    expect(freeze.status).toBe('immune')
    if (freeze.status === 'immune') expect(freeze.sources[0]).toMatchObject({ slotLabel: 'Boots', line: 'Cannot be Frozen' })
    expect(r.find((a) => a.ailment === 'ignite')!.status).toBe('immune')
    expect(r.find((a) => a.ailment === 'shock')!.status).toBe('unknown')
  })

  it('ignores items in the inactive weapon set', () => {
    const r = ailmentImmunities([item('Weapon 2', ['Cannot be Shocked'], false)])
    expect(r.find((a) => a.ailment === 'shock')!.status).toBe('unknown')
  })

  it('counts every ailment in a combined line', () => {
    const r = ailmentImmunities([item('Boots', ['Cannot be Frozen or Chilled'])])
    expect(r.find((a) => a.ailment === 'freeze')!.status).toBe('immune')
    expect(r.find((a) => a.ailment === 'chill')!.status).toBe('immune')
  })

  it('does not count conditional or enemy-subject lines', () => {
    const r = ailmentImmunities([item('Boots', ['Cannot be Frozen while moving', 'Enemies cannot be Stunned'])])
    expect(r.find((a) => a.ailment === 'freeze')!.status).toBe('unknown')
    expect(r.find((a) => a.ailment === 'stun')!.status).toBe('unknown')
  })

  it('does not treat "increased freeze buildup" style lines as immunity', () => {
    const r = ailmentImmunities([item('Gloves', ['20% increased Freeze Buildup', 'Hits cannot be Evaded'])])
    expect(r.find((a) => a.ailment === 'freeze')!.status).toBe('unknown')
  })
})

describe('ailmentImmunities from the passive tree', () => {
  const node = (name: string, stats: string[], ascendancy: string | null = null) => ({ name, stats, ascendancy })

  it('reads allocated passive and ascendancy nodes and names them', () => {
    const r = ailmentImmunities([], [node('Unflinching', ['Cannot be Shocked']), node('Ice Wall', ['Immune to Ignite'], 'Stormweaver')])
    const shock = r.find((a) => a.ailment === 'shock')!
    expect(shock.status === 'immune' && shock.sources[0]).toMatchObject({ slotLabel: 'Passive tree', itemName: 'Unflinching' })
    const ignite = r.find((a) => a.ailment === 'ignite')!
    expect(ignite.status === 'immune' && ignite.sources[0]?.slotLabel).toBe('Ascendancy (Stormweaver)')
  })

  it('ignores conditional tree lines', () => {
    const r = ailmentImmunities([], [node('A', ['Immune to Shock if a majority of your Socketed Support Gems are Green', 'Immune to Freeze and Chill while affected by Ice Archon'])])
    expect(r.every((a) => a.status === 'unknown')).toBe(true)
  })

  it('does not count light-stun immunity as stun immunity', () => {
    const r = ailmentImmunities([], [node('B', ['Cannot be Light Stunned'])])
    expect(r.find((a) => a.ailment === 'stun')!.status).toBe('unknown')
  })

  it('says why when the tree was not read', () => {
    const none = ailmentImmunities([], null).find((a) => a.ailment === 'freeze')!
    const read = ailmentImmunities([], []).find((a) => a.ailment === 'freeze')!
    expect(none.status === 'unknown' && none.reason).toMatch(/tree data was not loaded/)
    expect(read.status === 'unknown' && read.reason).toMatch(/allocated passive/)
  })
})
