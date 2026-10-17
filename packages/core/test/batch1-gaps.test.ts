import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { analyzeCharacter } from '../src/analyze.js'
import { mainSkillNote, MAIN_SKILL_BASIS_NOTE } from '../src/dps/main-skill.js'
import { inactiveSetReport, primarySkillInInactiveSet } from '../src/model/slots.js'
import { axisOf } from '../src/recommend/axis.js'
import { duplicateFamilyNotes } from '../src/recommend/damage.js'
import type { PobSupport } from '../src/gems/catalog.js'
import type { Recommendation } from '../src/recommend/types.js'
import { scoreUpgrade } from '../src/upgrade/scoring.js'
import { withCardWarnings } from '../src/upgrade/warn.js'
import type { ObservedCard } from '../src/upgrade/types.js'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

describe('withCardWarnings', () => {
  const score = scoreUpgrade({ dps: 1, lowestMaxHit: 1, ehp: 1 }, { dps: 1, lowestMaxHit: 1, ehp: 1 }, { mode: 'bossing' })
  const card: ObservedCard = {
    id: 'x',
    source: 'ninja',
    slotId: 8,
    slotLabel: 'Ring 1',
    itemName: 'Doom Coil',
    gain: { damage: { kind: 'unknown', reason: 'n/a' }, survivability: { kind: 'unknown', reason: 'n/a' } },
    tradeoff: null,
    mods: [],
    assumptions: [],
    rarityLabel: null,
    score,
  }
  const ring = { name: 'Doom Coil', baseType: 'Ring', rarity: 'Rare' as const }

  it('fills warnings and leaves gain and score untouched', () => {
    const out = withCardWarnings(card, { ...ring, mods: ['10% increased Damage recently', '10% increased Damage recently'] })
    expect(out.warnings?.map((w) => w.kind)).toEqual(['conditional'])
    expect(out.gain).toBe(card.gain)
    expect(out.score).toBe(card.score)
    expect(card.warnings).toBeUndefined()
  })

  it('adds support warnings and omits the field when nothing applies', () => {
    const minion = { name: 'Minion Damage', tags: ['Minion'], stats: [] }
    expect(withCardWarnings(card, { ...ring, mods: [] }, minion).warnings?.map((w) => w.kind)).toEqual(['minion-dependent'])
    expect(withCardWarnings(card, { ...ring, mods: ['+40 to maximum Life'] })).toBe(card)
  })
})

describe('axisOf covers every stat the recommenders emit', () => {
  const dir = here('../src/recommend/')
  const src = readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => readFileSync(dir + f, 'utf8'))
    .join('\n')
  const rec = (stat: string): Pick<Recommendation, 'category' | 'impact'> => ({
    category: 'gear',
    impact: { stat, label: stat, from: 1, to: 2, delta: 1, unit: 'flat', significance: 0.5 },
  })
  // Stats that name no side on purpose; anything else must be classified.
  const DELIBERATELY_UNCLASSIFIED = new Set(['affixSlotsUsed', 'anoints', 'weaponItemLevel'])

  it('classifies each literal stat or lists it as deliberately unclassified', () => {
    const literals = new Set([...src.matchAll(/\bstat: '([A-Za-z]+)'/g)].map((m) => m[1]!))
    expect(literals.size).toBeGreaterThan(5)
    for (const stat of literals) {
      if (DELIBERATELY_UNCLASSIFIED.has(stat)) expect(axisOf(rec(stat))).toBe('unclassified')
      else expect(axisOf(rec(stat)), `stat ${stat} is not classified`).not.toBe('unclassified')
    }
  })

  it('classifies templated stats by their suffix', () => {
    const suffixes = new Set([...src.matchAll(/\bstat: `\$\{[^}]+\}([A-Za-z]+)`/g)].map((m) => m[1]!))
    expect(suffixes.size).toBeGreaterThan(0)
    for (const s of suffixes) expect(axisOf(rec(`fire${s}`)), `suffix ${s}`).toBe('survivability')
  })
})

describe('duplicateFamilyNotes cap and lineage', () => {
  const sup = (name: string, tier: number, lineage = false): PobSupport => ({
    id: name,
    name,
    description: null,
    family: ['Fam'],
    require: [],
    exclude: [],
    lineage,
    tier,
    effects: [],
    flags: [],
  })
  const used = new Map([['Fam', 'Held']])

  it('drops non-lineage gems above the cap and drops the note when none remain', () => {
    const gems = [sup('Low', 1), sup('High', 3)]
    expect(duplicateFamilyNotes(gems, used, 1)[0]).toMatch(/Low/)
    expect(duplicateFamilyNotes(gems, used, 1)[0]).not.toMatch(/High/)
    expect(duplicateFamilyNotes([sup('High', 3)], used, 1)).toEqual([])
    expect(duplicateFamilyNotes(gems, used)[0]).toMatch(/High/)
  })

  it('keeps lineage gems regardless of tier and marks them', () => {
    const note = duplicateFamilyNotes([sup('Lin', 9, true)], used, 1)[0]
    expect(note).toMatch(/Lin \(lineage\)/)
  })
})

describe('primarySkillInInactiveSet', () => {
  const known = (names: string[]) => ({ inactiveSet: 2 as const, skills: { status: 'known' as const, names } })

  it('flags a primary that sits in the inactive set, ignoring case', () => {
    expect(primarySkillInInactiveSet('Ice Shot', known(['ice shot']))).toMatch(/weapon set 2/)
  })

  it('says nothing when the set is not stated, the skill is live or there is no primary', () => {
    expect(primarySkillInInactiveSet('Ice Shot', { inactiveSet: 2, skills: { status: 'unknown', reason: 'r' } })).toBeNull()
    expect(primarySkillInInactiveSet('Ice Shot', known(['Spark']))).toBeNull()
    expect(primarySkillInInactiveSet(null, known(['Spark']))).toBeNull()
  })

  it('is null on the recorded character, which carries no weapon-set markers', async () => {
    const payload = JSON.parse(readFileSync(here('./fixtures/athrynas-v43.json'), 'utf8'))
    const a = await analyzeCharacter(payload)
    expect(primarySkillInInactiveSet(a.dps.primary?.name ?? null, a.inactiveSet)).toBeNull()
    expect(inactiveSetReport(payload.charModel ?? payload).skills.status).toBe('unknown')
  })
})

describe('mainSkillNote basis', () => {
  it('says the match is by name only', () => {
    const note = mainSkillNote({ skills: [], primary: null }, 'Ice Shot')
    expect(note?.basisNote).toBe(MAIN_SKILL_BASIS_NOTE)
    expect(mainSkillNote({ skills: [], primary: null }, null)).toBeNull()
  })
})
