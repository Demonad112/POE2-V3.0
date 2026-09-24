/**
 * Replacement planning against the real captured character.
 *
 * The character's fire is 99% before the cap (24 over), cold 74, lightning 83
 * (8 over), chaos 18 — so removing the Hypnotic Halo helmet (40 fire, 35 cold,
 * 38 lightning) drops fire 16, cold 36 and lightning 30 below cap. Those are
 * the numbers every assertion below rests on.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { normalizeItems } from '../src/model/slots.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { planReplacement, resistancesFrom } from '../src/gear/replace.js'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '..', '..', 'data', 'generated')
const payload = JSON.parse(readFileSync(join(here, 'fixtures', 'athrynas-v43.json'), 'utf8'))
const model = payload.charModel ?? payload
const tiers = new ModTiers(JSON.parse(readFileSync(join(dataDir, 'mod-tiers.json'), 'utf8')) as ModTierData)
const analysis = await analyzeCharacter(payload)
const items = normalizeItems(model).filter((i) => i.active)
const analysed = items.map((i) => analyzeItem(i, tiers, analysis.defense))
const bySlot = (label: string) => analysed.find((i) => i.slotLabel === label)!

const plan = (label: string, extra: { omitResistances?: string[]; maxIlvl?: number } = {}) =>
  planReplacement({ target: bySlot(label), items: analysed, rawItems: items, defense: analysis.defense, tiers, ...extra })

describe('resistancesFrom', () => {
  it('sums every resistance line on the item', () => {
    expect(resistancesFrom(bySlot('Helmet'))).toMatchObject({ fire: 40, cold: 35, lightning: 38 })
  })
})

describe('planReplacement', () => {
  it('measures what the item holds up', () => {
    const p = plan('Helmet')
    const byType = Object.fromEntries(p.resistances.map((r) => [r.type, r.deficitIfRemoved]))
    expect(byType).toEqual({ fire: 16, cold: 36, lightning: 30 })
  })

  it('puts the resistances it holds up into the spec first, at T1 for the base', () => {
    const p = plan('Helmet')
    const suffixes = p.spec.filter((l) => l.kind === 'suffix')
    expect(suffixes.map((l) => l.why)).toEqual(['needed-resistance', 'needed-resistance', 'needed-resistance'])
    expect(suffixes.every((l) => l.tier === 1 && l.min === 41)).toBe(true)
    expect(p.followUps).toEqual([])
    expect(p.uncovered).toEqual([])
  })

  it('keeps each of the item\'s own lines in its own ladder', () => {
    const p = plan('Helmet')
    const es = p.spec.filter((l) => l.text?.includes('increased Energy Shield'))
    // Two different ES% modifiers on the helmet → two different ladders, never
    // the same line twice.
    expect(new Set(es.map((l) => l.affix)).size).toBe(es.length)
    const upgraded = es.find((l) => l.current === 76)!
    expect(upgraded.max).toBeGreaterThanOrEqual(76)
  })

  it('reports an existing shortfall without charging it to the swap', () => {
    const p = plan('Helmet')
    expect(p.existingShortfalls.find((s) => s.type === 'chaos')).toMatchObject({ points: 57 })
    expect(p.followUps.some((f) => f.type === 'chaos')).toBe(false)
  })

  it('orders follow-ups on other items when a resistance is left off', () => {
    const p = plan('Helmet', { omitResistances: ['fire', 'cold'] })
    expect(p.spec.some((l) => l.statId === 'base_fire_damage_resistance_%')).toBe(false)
    expect(p.followUps.map((f) => f.step)).toEqual(p.followUps.map((_, i) => i + 1))
    const first = p.followUps[0]!
    expect(first).toMatchObject({ type: 'cold', action: 'upgrade-tier', itemName: 'Viper Hide' })
    expect(first.from).toMatchObject({ value: 26, tier: 4 })
    expect(first.to).toMatchObject({ tier: 1, min: 41 })
    expect(first.closes).toBe(15)
    // Follow-ups never touch the item being replaced.
    expect(p.followUps.every((f) => f.itemName !== 'Hypnotic Halo')).toBe(true)
    // What current gear can't close is stated, not dropped.
    const fire = p.uncovered.find((u) => u.type === 'fire')
    expect(fire?.points).toBe(13)
  })

  it('spends no suffix on a resistance the character stays capped on', () => {
    // Ring 1's 22 fire (the Ruby Ring implicit) sits inside the 24-point
    // overcap, so the character stays capped without it.
    const p = plan('Ring 1')
    expect(p.resistances.find((r) => r.type === 'fire')).toMatchObject({ fromItem: 22, deficitIfRemoved: 0 })
    expect(p.spec.some((l) => l.statId === 'base_fire_damage_resistance_%')).toBe(false)
  })

  it('says when a base cannot roll a resistance at all', () => {
    const p = plan('Main Hand', { omitResistances: [] })
    expect(p.resistances).toEqual([])
    expect(p.spec.every((l) => l.kind === 'prefix' || l.kind === 'suffix')).toBe(true)
  })

  it('honours an item level cap', () => {
    const capped = plan('Helmet', { maxIlvl: 70 })
    expect(capped.ilvlNeeded).not.toBeNull()
    expect(capped.ilvlNeeded!).toBeLessThanOrEqual(70)
  })
})
