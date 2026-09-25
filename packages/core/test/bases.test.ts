/**
 * Base data from Path of Building, and the alternative-bases comparison on the
 * captured character's helmet (Hypnotic Halo, an energy shield base).
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { normalizeItems } from '../src/model/slots.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { planReplacement } from '../src/gear/replace.js'
import { BaseCatalog, alternativeBases, implicitResistances, type BaseData } from '../src/gear/bases.js'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '..', '..', 'data', 'generated')
const payload = JSON.parse(readFileSync(join(here, 'fixtures', 'athrynas-v43.json'), 'utf8'))
const model = payload.charModel ?? payload
const tiers = new ModTiers(JSON.parse(readFileSync(join(dataDir, 'mod-tiers.json'), 'utf8')) as ModTierData)
const catalog = new BaseCatalog(JSON.parse(readFileSync(join(dataDir, 'bases.json'), 'utf8')) as BaseData)
const analysis = await analyzeCharacter(payload)
const items = normalizeItems(model).filter((i) => i.active)
const analysed = items.map((i) => analyzeItem(i, tiers, analysis.defense))
const bySlot = (label: string) => analysed.find((i) => i.slotLabel === label)!
const plan = (label: string) =>
  planReplacement({ target: bySlot(label), items: analysed, rawItems: items, defense: analysis.defense, tiers })

describe('BaseCatalog', () => {
  it('reads defences, requirements and implicits from PoB', () => {
    expect(catalog.get('Soldier Greathelm')).toMatchObject({
      type: 'Helmet',
      subType: 'Armour',
      armour: { Armour: 80 },
      req: { level: 12, str: 19 },
      obtainable: true,
    })
    expect(catalog.get('Ruby Ring')?.implicit).toEqual(['+(20-30)% to Fire Resistance'])
  })

  it('never offers hidden bases', () => {
    expect(catalog.sameSlot('Soldier Greathelm').some((b) => b.name.startsWith('Runemastered'))).toBe(false)
  })
})

describe('implicitResistances', () => {
  it('takes the minimum roll, and spreads all-elemental over three types', () => {
    expect(implicitResistances(['+(20-30)% to Fire Resistance'])).toEqual([{ type: 'fire', min: 20 }])
    expect(implicitResistances(['+(7-10)% to all Elemental Resistances']).map((r) => r.type)).toEqual([
      'fire',
      'cold',
      'lightning',
    ])
  })
})

describe('alternativeBases', () => {
  const helmet = bySlot('Helmet')
  const result = alternativeBases({ plan: plan('Helmet'), catalog, tiers })

  it('lists the current base first', () => {
    expect(result.type).toBe('Helmet')
    expect(result.options[0]).toMatchObject({ name: helmet.baseType, current: true, lostLines: [] })
  })

  it('shows one base per defence type, never the current one twice', () => {
    const others = result.options.slice(1)
    expect(others.length).toBeGreaterThan(0)
    expect(others.length).toBeLessThanOrEqual(6)
    expect(others.some((o) => o.current)).toBe(false)
    const kinds = others.map((o) => `${o.subType}|${o.implicit.join('|')}`)
    expect(new Set(kinds).size).toBe(kinds.length)
  })

  it('reports lines a base cannot roll instead of hiding it', () => {
    const lost = result.options.slice(1).filter((o) => o.lostLines.length)
    // Energy-shield lines can't roll on a pure armour or evasion helmet.
    for (const o of lost) expect(o.specFits + o.lostLines.length).toBe(plan('Helmet').spec.length)
    const ordered = result.options.slice(1).map((o) => o.lostLines.length)
    expect(ordered).toEqual([...ordered].sort((a, b) => a - b))
  })

  it('checks attribute requirements only when attributes are known', () => {
    expect(result.options.every((o) => o.unmetAttributes.length === 0)).toBe(true)
    expect(result.notes.some((n) => n.includes('not checked'))).toBe(true)
    const strict = alternativeBases({ plan: plan('Helmet'), catalog, tiers, attributes: { str: 0, dex: 0, int: 0 } })
    expect(strict.options.some((o) => o.unmetAttributes.length > 0)).toBe(true)
  })
})
