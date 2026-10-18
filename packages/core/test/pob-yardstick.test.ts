import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { analyzeCharacter, unwrapCharModel } from '../src/analyze.js'
import { decodePobExport, readPlayerStats } from '../src/pob/export.js'

// The fixture's own PoB export is the yardstick for the analyzer's figures
// (checked 2026-10-18 against the numbers below). Fixture only; no live PoB.
const raw = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/athrynas-v43.json', import.meta.url)), 'utf8'))
const model = unwrapCharModel(raw) as { pathOfBuildingExport?: string }
const analysis = await analyzeCharacter(raw)
const pob = readPlayerStats(await decodePobExport(model.pathOfBuildingExport ?? ''))

describe('analyzer figures against the fixture PoB export', () => {
  it('matches life, energy shield and resistances exactly', () => {
    expect(analysis.defense.life).toBe(pob.Life)
    expect(analysis.defense.energyShield).toBe(pob.EnergyShield)
    const res = (t: string) => analysis.defense.resistances.find((r) => r.type === t)?.value
    expect(res('fire')).toBe(pob.FireResist)
    expect(res('cold')).toBe(pob.ColdResist)
    expect(res('lightning')).toBe(pob.LightningResist)
    expect(res('chaos')).toBe(pob.ChaosResist)
  })

  it('matches the effective hit pool within 1%', () => {
    const ehp = analysis.defense.effectiveHealthPool
    expect(ehp).not.toBeNull()
    expect(Math.abs((ehp as number) - pob.TotalEHP) / pob.TotalEHP).toBeLessThan(0.01)
  })

  it('matches the main skill and its DPS within 1% (analyzer adds damage over time to hit DPS)', () => {
    expect(analysis.dps.primary?.name).toBe(analysis.dps.mainSkill?.exportMain)
    const dps = analysis.dps.primary?.totalDps as number
    expect(Math.abs(dps - pob.TotalDPS) / pob.TotalDPS).toBeLessThan(0.01)
  })
})
