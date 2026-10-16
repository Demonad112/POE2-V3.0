import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { analyzeCharacter, unwrapCharModel } from '../src/analyze.js'
import { holdingUp } from '../src/constraints/holding-up.js'
import type { CharModel } from '../src/model/types.js'

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/athrynas-v43.json', import.meta.url)), 'utf8'),
) as unknown

async function mapFor(model: CharModel) {
  const a = await analyzeCharacter({ charModel: model })
  return { a, map: holdingUp({ model: a.model, defense: a.defense, attribution: a.attribution, items: a.items, pobStats: a.pobStats }) }
}

describe('holdingUp on the recorded character', () => {
  it('reports resist slack and shortfall from the sheet', async () => {
    const { a, map } = await mapFor(unwrapCharModel(fixture))
    const fire = map.resistances.find((r) => r.type === 'fire')!
    const cold = map.resistances.find((r) => r.type === 'cold')!
    expect(fire).toMatchObject({ known: true, source: 'ninja' })
    expect(fire.slack).toBe(a.defense.resistances.find((r) => r.type === 'fire')!.overCap)
    expect(fire.slack).toBeGreaterThan(0) // fixture: fire sits over cap
    expect(cold.short).toBeGreaterThan(0) // fixture: cold one short of cap
  })

  it('minToKeep is 0 for a capped stat whose overcap covers the item', async () => {
    const { a, map } = await mapFor(unwrapCharModel(fixture))
    const atCap = (stat: string) => a.attribution.stats.find((s) => s.stat === stat && s.cap !== null && s.total >= s.cap)
    const covered = map.items.flatMap((i) => i.holds).filter((h) => atCap(h.stat) && !h.dropsBelowCap)
    expect(covered.length).toBeGreaterThan(0)
    for (const h of covered) expect(h.minToKeep).toBe(0)
  })

  it('minToKeep never exceeds what the item grants and is 0 inside the overcap', async () => {
    const { map } = await mapFor(unwrapCharModel(fixture))
    const capped = map.items.flatMap((i) => i.holds).filter((h) => h.minToKeep !== null)
    expect(capped.length).toBeGreaterThan(0)
    for (const h of capped) {
      expect(h.minToKeep!).toBeGreaterThanOrEqual(0)
      expect(h.minToKeep!).toBeLessThanOrEqual(h.flat + 1) // attribution tolerates one point of rounding (breakdown totals are rounded)
    }
  })

  it('takes spirit and attribute headroom from the PoB export and labels them so', async () => {
    const { map } = await mapFor(unwrapCharModel(fixture))
    expect(map.spirit.source).toBe('pob-export')
    expect(map.attributes.source).toBe('pob-export')
    expect(map.spirit.value === null ? map.spirit.reason : null).not.toBe('')
  })

  it('never reports per-item movement speed', async () => {
    const { map } = await mapFor(unwrapCharModel(fixture))
    expect(map.movementSpeed.perItem).toBe('unknown')
  })
})

describe('holdingUp with missing data', () => {
  it('empty model: every resistance unknown, no invented zero', async () => {
    const { map } = await mapFor({})
    for (const r of map.resistances) {
      expect(r).toMatchObject({ known: false, value: null, slack: null, short: null })
    }
    expect(map.items).toEqual([])
    expect(map.movementSpeed.value).toBeNull()
  })

  it('partial model: only the stats present are known', async () => {
    const { map } = await mapFor({ defensiveStats: { fireResistance: 75, fireResistanceMax: 75, fireResistanceOverCap: 10 } })
    expect(map.resistances.find((r) => r.type === 'fire')).toMatchObject({ known: true, slack: 10, short: 0 })
    expect(map.resistances.find((r) => r.type === 'cold')!.known).toBe(false)
  })

  it('no PoB export: spirit and attributes are null with a reason', async () => {
    const m = unwrapCharModel(fixture)
    const { pathOfBuildingExport: _drop, ...rest } = m
    const { map } = await mapFor(rest)
    expect(map.spirit).toMatchObject({ value: null, source: 'pob-export' })
    expect(map.spirit.reason).toMatch(/export/i)
    expect(map.attributes.value).toEqual([])
    expect(map.attributes.reason).toMatch(/export/i)
  })
})
