/**
 * Support-gem valuation and the damage review, against PoB 2's extracted data
 * and the captured Ice Shot character.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { normalizeItems } from '../src/model/slots.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { analyzeItem } from '../src/gear/analyze.js'
import {
  SupportCatalog,
  supportValue,
  typeExpressionMatches,
  usageRestriction,
  type PobSkillData,
} from '../src/gems/catalog.js'
import { parseAllSetups } from '../src/gems/index.js'
import { highestSocketedTier, reviewDamage } from '../src/recommend/damage.js'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '..', '..', 'data', 'generated')
const payload = JSON.parse(readFileSync(join(here, 'fixtures', 'athrynas-v43.json'), 'utf8'))
const model = payload.charModel ?? payload
const tiers = new ModTiers(JSON.parse(readFileSync(join(dataDir, 'mod-tiers.json'), 'utf8')) as ModTierData)
const catalog = new SupportCatalog(JSON.parse(readFileSync(join(dataDir, 'pob-skills.json'), 'utf8')) as PobSkillData)
const analysis = await analyzeCharacter(payload)
const items = normalizeItems(model).filter((i) => i.active)
const analysed = items.map((i) => analyzeItem(i, tiers, analysis.defense))

const types = (...t: string[]) => new Set(t)

describe('typeExpressionMatches', () => {
  it('evaluates PoB postfix expressions', () => {
    expect(typeExpressionMatches(['Attack', 'Spell'], types('Spell'))).toBe(true)
    expect(typeExpressionMatches(['Attack', 'Projectile', 'AND'], types('Attack'))).toBe(false)
    expect(typeExpressionMatches(['Attack', 'Projectile', 'AND'], types('Attack', 'Projectile'))).toBe(true)
    expect(typeExpressionMatches(['Cooldown', 'NOT'], types('Attack'))).toBe(true)
    expect(typeExpressionMatches([], types('Attack'))).toBe(false)
  })
})

describe('supportValue', () => {
  const brutality = catalog.support('Brutality I')!

  it('weighs a typed "more" by the skill\'s own damage split', () => {
    const pure = supportValue(brutality, types('Attack', 'Damage'), [{ type: 'physical', percent: 100 }])
    expect(pure.damage).toBeCloseTo(1.25)
    // 60% physical: the 40% elemental is zeroed by Brutality's own flag.
    const mixed = supportValue(brutality, types('Attack', 'Damage'), [
      { type: 'physical', percent: 60 },
      { type: 'cold', percent: 40 },
    ])
    expect(mixed.damage).toBeCloseTo(0.6 * 1.25)
    expect(mixed.dps).toBeLessThan(1)
  })

  it('averages every-Nth-use effects', () => {
    const charged = catalog.support('Charged Shots II')!
    const v = supportValue(charged, catalog.activeTypes('Ice Shot')!, [{ type: 'cold', percent: 100 }])
    expect(v.damage).toBeCloseTo(1.2)
  })

  it('names "increased" effects instead of valuing them', () => {
    const rapid = catalog.support('Rapid Attacks II')!
    const v = supportValue(rapid, catalog.activeTypes('Ice Shot')!, [{ type: 'cold', percent: 100 }])
    expect(v.offensive).toBe(true)
    expect(v.quantified).toBe(false)
  })

  it('keeps conditional effects out of the number', () => {
    const longshot = catalog.support('Longshot II')!
    const v = supportValue(longshot, catalog.activeTypes('Ice Shot')!, [{ type: 'cold', percent: 100 }])
    expect(v.dps).toBe(1)
    expect(v.conditional.length).toBeGreaterThan(0)
  })

  it('reads usage restrictions from the gem description', () => {
    expect(usageRestriction(catalog.support('Hit and Run')!)).toMatch(/can only be used/)
    expect(usageRestriction(brutality)).toBeNull()
  })
})

describe('reviewDamage', () => {
  const review = reviewDamage({
    dps: analysis.dps,
    setups: parseAllSetups(model.skills),
    items: analysed,
    rawItems: items,
    tiers,
    catalog,
  })!

  it('reviews the main skill with PoB\'s types', () => {
    expect(review.skill).toBe('Ice Shot')
    expect(review.skillTypes).toContain('Attack')
    expect(review.supports.every((s) => s.compatible === true)).toBe(true)
  })

  it('never auto-suggests a restricted or clashing support', () => {
    for (const swap of review.gemSwaps) {
      for (const c of swap.candidates) {
        expect(c.restriction).toBeNull()
        expect(c.conflicts).toEqual([])
      }
    }
    // Elemental Focus stops the freeze Ice Bite needs — flagged, not hidden.
    const focus = review.strongestCompatible.find((c) => c.name === 'Elemental Focus')
    expect(focus?.conflicts.join(' ')).toMatch(/Ice Bite/)
  })

  it('only lists gear lines that scale what the skill deals', () => {
    expect(review.gear.length).toBeGreaterThan(0)
    for (const g of review.gear) expect(g.why).not.toBe('')
    expect(review.gear.some((g) => /Cold damage/i.test(g.text))).toBe(true)
    expect(review.gear.some((g) => /Fire Resistance/.test(g.text))).toBe(false)
  })
})

describe('support tier cap and lineage', () => {
  const setups = parseAllSetups(model.skills)
  const base = { dps: analysis.dps, setups, items: analysed, rawItems: items, tiers, catalog }
  const uncapped = reviewDamage(base)!

  it('reads the highest tier the character already sockets', () => {
    const socketed = setups.flatMap((s) => s.supports.map((g) => catalog.support(g.name))).filter((s) => s && !s.lineage)
    expect(highestSocketedTier(setups, catalog)).toBe(Math.max(...socketed.map((s) => s!.tier)))
  })

  it('never ranks a lineage support, and lists them apart', () => {
    expect(uncapped.strongestCompatible.some((c) => c.lineage)).toBe(false)
    for (const swap of uncapped.gemSwaps) expect(swap.candidates.some((c) => c.lineage)).toBe(false)
    expect(uncapped.lineageOptions.length).toBeGreaterThan(0)
    expect(uncapped.lineageOptions.every((c) => c.lineage)).toBe(true)
    // Unique names: one row per gem, even where PoB lists a gem twice.
    expect(new Set(uncapped.lineageOptions.map((c) => c.name)).size).toBe(uncapped.lineageOptions.length)
    expect(uncapped.maxSupportTier).toBeNull()
    expect(uncapped.aboveTierCap).toBe(0)
  })

  it('holds candidates to the cap and falls back within a family', () => {
    const capped = reviewDamage({ ...base, maxSupportTier: 1 })!
    expect(capped.maxSupportTier).toBe(1)
    expect(capped.strongestCompatible.every((c) => c.tier <= 1)).toBe(true)
    for (const swap of capped.gemSwaps) expect(swap.candidates.every((c) => c.tier <= 1)).toBe(true)
    expect(capped.aboveTierCap).toBeGreaterThan(0)
    expect(capped.notes.some((n) => n.includes('highest you\'ve said you can cut'))).toBe(true)
    // A family whose top tier is above the cap is represented by a lower tier of it, never the top one.
    const lowered = capped.strongestCompatible.filter((c) =>
      catalog.support(c.name)!.family.some((f) =>
        uncapped.strongestCompatible.some((u) => u.tier > 1 && catalog.support(u.name)!.family.includes(f)),
      ),
    )
    for (const c of lowered) expect(uncapped.strongestCompatible.some((u) => u.name === c.name)).toBe(false)
  })
})
