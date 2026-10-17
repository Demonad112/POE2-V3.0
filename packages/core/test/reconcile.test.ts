import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeDps } from '../src/dps/index.js'
import { unwrapCharModel } from '../src/analyze.js'
import { analyzeCharacter } from '../src/analyze.js'
import { reconcile } from '../src/reconcile/index.js'
import type { CharModel } from '../src/model/types.js'

/**
 * A model whose breakdowns hold one unmapped id (87) that does not equal its
 * own arithmetic, one unmapped id (79) one unit apart, and one identified stat
 * (life) that is consistent.
 */
const model = {
  defensiveStats: { life: 1000 },
  breakdowns: {
    sources: [[0]],
    stats: {
      '0': { base: 1000, inc: 0, more: 1, total: 1000, basePercent: false, mods: [] },
      '87': { base: 14, inc: 0, more: 1, total: 0, basePercent: false, mods: [] },
      '79': { base: 53, inc: 0, more: 1, total: 52, basePercent: false, mods: [] },
    },
  },
} as unknown as CharModel

describe('unmapped stat ids', () => {
  const report = reconcile(model, {})
  const byStat = (key: string) => report.checks.find((c) => c.stat === `breakdown:${key}`)

  it('are reported as unmapped, never major or minor', () => {
    expect(byStat('stat_87')?.severity).toBe('unmapped')
    expect(byStat('stat_79')?.severity).toBe('unmapped')
    expect(report.unmapped).toBe(2)
    expect(report.major).toBe(0)
    expect(report.clean).toBe(true)
  })

  it('still carry both values so nothing is hidden', () => {
    expect(byStat('stat_87')).toMatchObject({ ninja: 0, other: 14 })
  })

  it('do not raise the cross-validation banner', async () => {
    const analysis = await analyzeCharacter({ type: 'x', charModel: model } as never)
    expect(analysis.warnings.join(' ')).not.toMatch(/disagree/)
  })
})

describe('rounding tolerance', () => {
  const pob = (value: number, ninja: number) =>
    reconcile({ defensiveStats: { life: ninja, energyShield: 0 } } as unknown as CharModel, { Life: value }).checks.find(
      (c) => c.stat === 'life',
    )!

  it('treats one unit apart as at most minor, even when that is over 5%', () => {
    expect(pob(3, 2).severity).toBe('minor')
    expect(pob(53, 52).severity).toBe('minor')
  })

  it('still flags a real disagreement as major', () => {
    expect(pob(1200, 1000).severity).toBe('major')
    expect(pob(4, 2).severity).toBe('major')
  })

  it('keeps exact and sub-half-percent agreement as a match', () => {
    expect(pob(1000, 1000).severity).toBe('match')
    expect(pob(1004, 1000).severity).toBe('match')
  })
})

describe('banner wording', () => {
  it('names the export only for disagreements with the export', async () => {
    const analysis = await analyzeCharacter({ type: 'x', charModel: { defensiveStats: { life: 1000 } } } as never)
    expect(analysis.warnings.join(' ')).not.toMatch(/Path of Building export/)
  })
})

describe('DPS pairing', () => {
  const fixture = unwrapCharModel(
    JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/athrynas-v43.json', import.meta.url)), 'utf8')),
  )
  const skills = analyzeDps(fixture).hitSkills
  const primary = skills[0]!
  const other = skills.find((s) => s.name !== primary.name && s.dps > 0)!

  it('pairs PoB’s figure with poe.ninja’s figure for the skill the export marks as main', () => {
    const r = reconcile(fixture, { TotalDPS: other.dps }, { pobMainSkill: other.name })
    const c = r.checks.find((x) => x.stat.startsWith('dps:'))!
    expect(c.stat).toBe(`dps:${other.name}`)
    expect(c.ninja).toBe(other.dps)
    expect(c.severity).toBe('match')
  })

  it('no longer reports a false disagreement when the export’s main skill is not the top one', () => {
    // Legacy pairing compares PoB’s figure for `other` with the top skill.
    const legacy = reconcile(fixture, { TotalDPS: other.dps })
    expect(legacy.checks.find((x) => x.stat.startsWith('dps:'))!.severity).toBe('major')
    const named = reconcile(fixture, { TotalDPS: other.dps }, { pobMainSkill: other.name })
    expect(named.checks.find((x) => x.stat.startsWith('dps:'))!.severity).toBe('match')
  })

  it('compares nothing when the export does not say which skill it computed', () => {
    const r = reconcile(fixture, { TotalDPS: primary.dps }, { pobMainSkill: null })
    for (const c of r.checks.filter((x) => x.stat.startsWith('dps:'))) expect(c.severity).toBe('unresolved')
  })

  it('compares nothing when poe.ninja has no hit damage for the export’s main skill', () => {
    const r = reconcile(fixture, { TotalDPS: 1 }, { pobMainSkill: 'Not A Skill' })
    const c = r.checks.find((x) => x.stat === 'dps:Not A Skill')!
    expect(c.severity).toBe('unresolved')
    expect(c.note).toContain('nothing was compared')
  })
})
