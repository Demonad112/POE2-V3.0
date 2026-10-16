/**
 * Golden outputs.
 *
 * One RECORDED character (athrynas-v43) plus four DERIVED variants made by
 * applying a small patch to it. Derived variants are not captures of real
 * characters; they exist to pin the engine's behaviour on partial and unusual
 * payloads. See golden/README.md.
 *
 * Expected outputs live in golden/*.expected.json. A change to the engine or
 * the data that alters any of them shows up as a diff in `npm test`. Regenerate
 * deliberately with `npx vitest run -u` in packages/core and review the diff.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { analyzeCharacter } from '../src/analyze.js'
import { analysisCacheKey } from '../src/cache/key.js'
import { holdingUp } from '../src/constraints/holding-up.js'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const recorded = JSON.parse(readFileSync(here('./fixtures/athrynas-v43.json'), 'utf8')) as Record<string, unknown>

interface Op {
  path: string
  set?: unknown
  delete?: true
}

function applyPatch(base: Record<string, unknown>, ops: Op[]): Record<string, unknown> {
  const doc = structuredClone(base)
  for (const op of ops) {
    const keys = op.path.split('.')
    const last = keys.pop()!
    let node = doc as Record<string, unknown>
    for (const k of keys) node = node[k] as Record<string, unknown>
    if (op.delete) delete node[last]
    else node[last] = op.set
  }
  return doc
}

const VARIANTS: { name: string; patch: string | null; knownIssue?: string }[] = [
  { name: 'recorded-athrynas-v43', patch: null },
  { name: 'no-pob-export', patch: 'no-pob-export' },
  {
    name: 'sparse-defence',
    patch: 'sparse-defence',
    knownIssue: 'B1: absent resistances appear as 0 in `defence.resistances`; `holdingUp.resistances` marks them unknown.',
  },
  { name: 'second-weapon-set', patch: 'second-weapon-set' },
  { name: 'no-skills', patch: 'no-skills' },
]

async function view(doc: Record<string, unknown>, knownIssue?: string) {
  const a = await analyzeCharacter(doc)
  const holding = holdingUp({ model: a.model, defense: a.defense, attribution: a.attribution, items: a.items, pobStats: a.pobStats })
  return {
    ...(knownIssue ? { knownIssue } : {}),
    identity: a.identity,
    defence: {
      lowestMaximumHit: a.defense.lowestMaximumHit,
      lowestMaximumHitType: a.defense.lowestMaximumHitType,
      life: a.defense.life,
      energyShield: a.defense.energyShield,
      resistances: a.defense.resistances.map((r) => ({ type: r.type, value: r.value, max: r.max, overCap: r.overCap, underCap: r.underCap })),
    },
    activeSlots: a.items.filter((i) => i.active).map((i) => i.slotId),
    primarySkill: a.dps.primary ? { name: a.dps.primary.name, totalDps: a.dps.primary.totalDps } : null,
    assessment: {
      score: a.assessment.score,
      scoreRange: a.assessment.scoreRange,
      tier: a.assessment.tier,
      tierRange: a.assessment.tierRange,
      offenceUnscoredReason: a.assessment.offenceUnscoredReason,
      weaknesses: a.assessment.weaknesses.map((w) => `${w.severity}: ${w.text}`),
    },
    recommendations: a.recommendations.recommendations.slice(0, 5).map((r) => r.id),
    pobConfigInputCount: a.pobConfig?.inputCount ?? null,
    warnings: a.warnings,
    holdingUp: {
      resistances: holding.resistances,
      items: holding.items.map((i) => ({
        slot: i.slotId,
        holds: i.holds.map((h) => ({ stat: h.stat, loss: h.loss, dropsBelowCap: h.dropsBelowCap, minToKeep: h.minToKeep })),
        anoint: i.anoint,
      })),
      spirit: holding.spirit.value,
      attributes: holding.attributes.value,
      movementSpeed: holding.movementSpeed.value,
    },
    cacheKey: await analysisCacheKey({ model: (a.model as Record<string, unknown>), pobVersion: null, dataVersion: 'golden' }),
  }
}

describe('golden outputs', () => {
  for (const v of VARIANTS) {
    it(v.name, async () => {
      const doc = v.patch
        ? applyPatch(recorded, (JSON.parse(readFileSync(here(`./golden/${v.patch}.patch.json`), 'utf8')) as { ops: Op[] }).ops)
        : recorded
      const out = await view(doc, v.knownIssue)
      await expect(`${JSON.stringify(out, null, 2)}\n`).toMatchFileSnapshot(`./golden/${v.name}.expected.json`)
    })
  }

  it('derived variants really differ from the recorded character', async () => {
    const keys = new Set<string>()
    for (const v of VARIANTS) {
      const doc = v.patch
        ? applyPatch(recorded, (JSON.parse(readFileSync(here(`./golden/${v.patch}.patch.json`), 'utf8')) as { ops: Op[] }).ops)
        : recorded
      keys.add((await view(doc)).cacheKey)
    }
    expect(keys.size).toBe(VARIANTS.length)
  })
})
