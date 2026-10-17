import { describe, expect, it } from 'vitest'
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
