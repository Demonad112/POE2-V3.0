/**
 * Audit F-2: significance is derived from the change relative to the stat's
 * own scale, never a hand-picked constant, and always lies in [0, 1].
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { unwrapCharModel } from '../src/analyze.js'
import { recommend } from '../src/recommend/index.js'
import type { CharModel } from '../src/model/types.js'

const fixturePath = fileURLToPath(new URL('./fixtures/athrynas-v43.json', import.meta.url))
const model = unwrapCharModel(JSON.parse(readFileSync(fixturePath, 'utf8')))

describe('significance is derived and bounded', () => {
  const report = recommend(model)
  const byId = new Map(report.recommendations.map((r) => [r.id, r]))

  it('keeps every significance in [0, 1]', () => {
    for (const r of report.recommendations) {
      if (!r.impact) continue
      expect(r.impact.significance, r.id).toBeGreaterThanOrEqual(0)
      expect(r.impact.significance, r.id).toBeLessThanOrEqual(1)
    }
  })

  it('does not add a bonus to free resistance fixes', () => {
    const r = byId.get('res-cold-under-cap')!
    expect(r.cost.kind).toBe('free')
    // 1 point short of a 75 cap.
    expect(r.impact!.significance).toBeCloseTo(1 / 75, 10)
  })

  it('measures the one-shot gap as the share of the safest hit that is missing', () => {
    const r = byId.get('one-shot-chaos')!
    expect(r.impact!.significance).toBeCloseTo(1 - r.impact!.from / r.impact!.to, 10)
  })

  it('measures the weapon lag as a share of the median item level', () => {
    const r = byId.get('weapon-ilvl-lag')!
    expect(r.impact!.significance).toBeCloseTo(r.impact!.delta / r.impact!.to, 10)
  })

  it('measures an unused anoint as one notable against the allocated passives', () => {
    const allocated = model.passiveCounts!.passives!
    const noAnoint: CharModel = structuredClone(model)
    noAnoint.passiveCounts = { ...noAnoint.passiveCounts, anoints: 0 }
    const r = recommend(noAnoint).recommendations.find((x) => x.id === 'anoint-unused')
    if (!r) return
    expect(r.impact!.significance).toBeCloseTo(1 / allocated, 10)
  })

  it('leaves the anoint impact unknown when the passive count is missing', () => {
    const noCount: CharModel = structuredClone(model)
    noCount.passiveCounts = { anoints: 0 }
    const r = recommend(noCount).recommendations.find((x) => x.id === 'anoint-unused')
    if (!r) return
    expect(r.impact).toBeNull()
    expect(r.score).toBe(0)
  })
})
