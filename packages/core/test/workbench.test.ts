/**
 * The gear workbench: edits to the equipped gear, and what they do to resistances.
 *
 * Same captured character as replace.test.ts: fire 99 before the cap (24 over),
 * cold 74 (1 under), lightning 83 (8 over). The helmet grants 40 fire, 35 cold
 * and 38 lightning.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { normalizeItems } from '../src/model/slots.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { RESIST_STAT, analyzeItem } from '../src/gear/analyze.js'
import {
  EMPTY_DRAFT,
  draftResistances,
  draftStatDelta,
  lineKey,
  openSlots,
  rankAffixCandidates,
  tierOptions,
  type GearDraft,
} from '../src/gear/workbench.js'

const here = dirname(fileURLToPath(import.meta.url))
const payload = JSON.parse(readFileSync(join(here, 'fixtures', 'athrynas-v43.json'), 'utf8'))
const model = payload.charModel ?? payload
const tiers = new ModTiers(
  JSON.parse(readFileSync(join(here, '..', '..', 'data', 'generated', 'mod-tiers.json'), 'utf8')) as ModTierData,
)
const analysis = await analyzeCharacter(payload)
const analysed = normalizeItems(model)
  .filter((i) => i.active)
  .map((i) => analyzeItem(i, tiers, analysis.defense))
const helmet = analysed.find((i) => i.slotLabel === 'Helmet')!
const fireIndex = helmet.mods.findIndex((m) => m.rolled.some((r) => r.id === RESIST_STAT.fire))
const resist = (draft: GearDraft) =>
  Object.fromEntries(draftResistances(analysis.defense, draftStatDelta(analysed, draft, tiers)).map((r) => [r.type, r]))

describe('draft resistances', () => {
  it('match the character sheet with no edits', () => {
    const r = resist(EMPTY_DRAFT)
    for (const d of analysis.defense.resistances) {
      expect(r[d.type]!.after).toBe(d.value + d.overCap)
      expect(r[d.type]!.changed).toBe(false)
    }
  })

  it('removing a resistance line shows the drop below cap', () => {
    const r = resist({ edits: { [lineKey(helmet.slotId, fireIndex)]: { kind: 'remove' } }, added: [] })
    const fire = r.fire!
    expect(fire.after).toBe(fire.before - 40)
    expect(fire.underCapAfter).toBe(16)
    expect(fire.changed).toBe(true)
  })

  it('setting another tier counts the new tier at the bottom of its range', () => {
    const mod = helmet.mods[fireIndex]!
    const options = tierOptions(tiers, helmet, mod.id!)
    const lowest = options.at(-1)!.entry
    const r = resist({ edits: { [lineKey(helmet.slotId, fireIndex)]: { kind: 'set', modId: lowest.id } }, added: [] })
    const floor = lowest.stats.find((s) => s.id === RESIST_STAT.fire)!.min
    expect(r.fire!.after).toBe(r.fire!.before - 40 + floor)
  })
})

describe('rankAffixCandidates', () => {
  it('puts a line that closes a draft shortfall first', () => {
    const draft: GearDraft = { edits: { [lineKey(helmet.slotId, fireIndex)]: { kind: 'remove' } }, added: [] }
    const list = rankAffixCandidates({
      tiers,
      item: helmet,
      kind: 'suffix',
      draft,
      resistances: draftResistances(analysis.defense, draftStatDelta(analysed, draft, tiers)),
      replacing: fireIndex,
    })
    expect(list[0]!.group).toBe('shortfall')
    const shortfall = list.filter((c) => c.group === 'shortfall')
    expect(shortfall.some((c) => c.closes.some((x) => x.type === 'fire' && x.points > 0))).toBe(true)
    // Most points closed first.
    const closed = shortfall.map((c) => c.closes.reduce((n, x) => n + x.points, 0))
    expect([...closed].sort((a, b) => b - a)).toEqual(closed)
  })

  it('never offers a group the item already carries, and ranks rarity above defence and damage', () => {
    const list = rankAffixCandidates({
      tiers,
      item: helmet,
      kind: 'suffix',
      draft: EMPTY_DRAFT,
      resistances: draftResistances(analysis.defense, {}),
    })
    const takenGroups = new Set(helmet.mods.map((m) => (m.id ? tiers.raw(m.id)?.g : null)).filter(Boolean))
    expect(list.some((c) => takenGroups.has(tiers.raw(c.entry.id)!.g))).toBe(false)
    const firstOf = (g: string) => list.findIndex((c) => c.group === g)
    const rarity = firstOf('rarity')
    if (rarity >= 0) {
      for (const g of ['defence', 'damage', 'attribute', 'other']) {
        const i = firstOf(g)
        if (i >= 0) expect(rarity).toBeLessThan(i)
      }
    }
    for (const c of list) expect(c.entry.ilvl).toBeLessThanOrEqual(helmet.itemLevel!)
  })

  it('counts an opened slot', () => {
    const before = openSlots(helmet, EMPTY_DRAFT, tiers)
    const after = openSlots(helmet, { edits: { [lineKey(helmet.slotId, fireIndex)]: { kind: 'remove' } }, added: [] }, tiers)
    if (before && after) expect(after.suffix).toBe(before.suffix + 1)
  })
})
