/**
 * "Which item to replace first" on the captured character. The Hypnotic Halo
 * helmet holds up fire, cold and lightning (see replace.test.ts); the weapon
 * has three lines that only a higher item-level base can improve.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { normalizeItems } from '../src/model/slots.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { rankReplacements } from '../src/gear/priority.js'
import { removalDeficits } from '../src/gear/replace.js'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '..', '..', 'data', 'generated')
const payload = JSON.parse(readFileSync(join(here, 'fixtures', 'athrynas-v43.json'), 'utf8'))
const model = payload.charModel ?? payload
const tiers = new ModTiers(JSON.parse(readFileSync(join(dataDir, 'mod-tiers.json'), 'utf8')) as ModTierData)
const analysis = await analyzeCharacter(payload)
const items = normalizeItems(model).filter((i) => i.active)
const analysed = items.map((i) => analyzeItem(i, tiers, analysis.defense))
const ranking = rankReplacements(analysed, analysis.defense)
const row = (label: string) => ranking.ranked.find((r) => r.slotLabel === label)!

describe('removalDeficits', () => {
  it('matches what the replacement planner charges the helmet', () => {
    const helmet = analysed.find((i) => i.slotLabel === 'Helmet')!
    expect(removalDeficits(helmet, analysis.defense)).toMatchObject({ fire: 16, cold: 36, lightning: 30 })
  })
})

describe('rankReplacements', () => {
  it('ranks every active non-unique item once, 1 first', () => {
    expect(ranking.ranked.map((r) => r.rank)).toEqual(ranking.ranked.map((_, i) => i + 1))
    expect(ranking.ranked.length + ranking.unranked.length).toBe(analysed.filter((i) => i.active).length)
    expect(ranking.unranked.every((r) => r.rarity === 'Unique' && r.rank === null)).toBe(true)
  })

  it('puts items at their base\'s ceiling first', () => {
    const counts = ranking.ranked.map((r) => r.needsNewBase.length)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
    expect(ranking.ranked[0]!.needsNewBase.length).toBeGreaterThan(0)
  })

  it('charges only new shortfalls to an item', () => {
    // Chaos is already 57 below cap; removing any item doesn't make that its fault.
    for (const r of ranking.ranked) expect(r.removalCost.chaos).toBeUndefined()
    expect(row('Helmet').removalCost).toMatchObject({ fire: 16, cold: 35, lightning: 30 })
  })

  it('states every reason it ranked on', () => {
    for (const r of ranking.ranked) {
      if (r.needsNewBase.length) expect(r.reasons.join(' ')).toMatch(/higher item-level base/)
      if (r.tiersBelowTop) expect(r.reasons.join(' ')).toMatch(/below the top/)
      if (r.wasted.length) expect(r.reasons.join(' ')).toMatch(/over the cap/)
    }
  })
})
