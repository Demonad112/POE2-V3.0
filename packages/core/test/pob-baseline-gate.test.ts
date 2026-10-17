import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { unwrapCharModel } from '../src/analyze.js'
import { checkBaseline, ninjaBaselineExpectations } from '../src/pob/baseline-gate.js'
import { analyzeFromPob } from '../src/pob/analyze.js'

describe('checkBaseline', () => {
  const life = { label: 'Life', expected: 1111, simulatedKeys: ['Life'] }

  it('passes when the baseline reproduces the observed value', () => {
    const r = checkBaseline([life], { Life: 1111 })
    expect(r.ok).toBe(true)
    expect(r.reason).toBeNull()
  })

  it('accepts off-by-one rounding and a 1% relative difference', () => {
    expect(checkBaseline([{ label: 'DPS', expected: 55512, simulatedKeys: ['TotalDPS'] }], { TotalDPS: 55513 }).ok).toBe(true)
    expect(checkBaseline([{ label: 'DPS', expected: 55512, simulatedKeys: ['TotalDPS'] }], { TotalDPS: 55900 }).ok).toBe(true)
    expect(checkBaseline([{ label: 'DPS', expected: 55512, simulatedKeys: ['TotalDPS'] }], { TotalDPS: 60930 }).ok).toBe(false)
  })

  it('names the failing stat and withholds deltas on a +10 resistance offset', () => {
    // The reference tool's failure: uncapped resistances uniformly +10.
    const exp = [{ label: 'Fire resistance (uncapped)', expected: 83, simulatedKeys: ['FireResist', 'FireResistOverCap'] }]
    const r = checkBaseline(exp, { FireResist: 75, FireResistOverCap: 18 })
    expect(r.ok).toBe(false)
    expect(r.failing.map((f) => f.label)).toEqual(['Fire resistance (uncapped)'])
    expect(r.reason).toContain('Fire resistance (uncapped)')
    expect(r.reason).toContain('withheld')
  })

  it('fails, not passes, when the simulation does not report a stat', () => {
    const r = checkBaseline([life], {})
    expect(r.ok).toBe(false)
    expect(r.checks[0]!.simulated).toBeNull()
  })

  it('does not pass vacuously with no expectations', () => {
    expect(checkBaseline([], { Life: 1 }).ok).toBe(false)
  })
})

describe('ninjaBaselineExpectations', () => {
  it('omits what poe.ninja did not report instead of defaulting to zero', () => {
    const exp = ninjaBaselineExpectations({ life: 1111 })
    expect(exp.map((e) => e.label)).toEqual(['Life'])
  })

  it('sums capped value and over-cap for uncapped resistances', () => {
    const exp = ninjaBaselineExpectations({ fireResistance: 75, fireResistanceOverCap: 8 })
    expect(exp).toEqual([
      expect.objectContaining({ label: 'Fire resistance (uncapped)', expected: 83, simulatedKeys: ['FireResist', 'FireResistOverCap'] }),
    ])
  })

  it('reproduces on the recorded fixture: its own PoB export passes the gate', async () => {
    const raw = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/athrynas-v43.json', import.meta.url)), 'utf8'))
    const model = unwrapCharModel(raw)
    const pob = await analyzeFromPob(model.pathOfBuildingExport!)
    const exp = ninjaBaselineExpectations(model.defensiveStats)
    const gate = checkBaseline(exp, pob.playerStats)
    expect(exp.length).toBeGreaterThan(8)
    expect(gate.failing.map((f) => f.reason)).toEqual([])
    expect(gate.ok).toBe(true)
  })
})
