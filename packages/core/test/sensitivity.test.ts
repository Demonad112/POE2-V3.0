import { describe, expect, it } from 'vitest'
import { PobBridge, type PobTransport } from '../src/pob/bridge.js'
import {
  bridgeProbe,
  DEFAULT_CONDITIONS,
  measureSensitivity,
  type SensitivityProbe,
} from '../src/pob/sensitivity.js'

/** A fake build: each active condition multiplies DPS. */
function fakeProbe(opts: { reject?: string[]; leaky?: string; failRestore?: string } = {}) {
  const factor: Record<string, number> = { shocked: 1.2, chilled: 1.05, ignited: 1.1, stationary: 1.3, charges: 1.5 }
  let active: string | null = null
  const log: string[] = []
  const probe: SensitivityProbe = {
    async apply(c) {
      log.push(`apply ${c.id}`)
      if (opts.reject?.includes(c.id)) throw new Error('addon rejected set_config_input')
      active = c.id
    },
    async measure() {
      return { TotalDPS: 1000 * (active ? factor[active]! : 1) }
    },
    async restore() {
      log.push('restore')
      if (opts.failRestore === active) throw new Error('socket closed')
      // `leaky`: restore does not actually clear this condition.
      if (opts.leaky !== active) active = null
    },
  }
  return { probe, log }
}

describe('measureSensitivity', () => {
  it('reports min and max across the baseline and every condition', async () => {
    const { probe } = fakeProbe()
    const r = await measureSensitivity(probe)
    expect(r.source).toBe('pob-sim')
    expect(r.baseline).toBe(1000)
    expect(r.readings).toHaveLength(DEFAULT_CONDITIONS.length)
    expect(r.range).toEqual({ min: 1000, max: 1500 })
    expect(r.unknownReason).toBeNull()
    expect(r.halted).toBe(false)
  })

  it('skips a condition the addon rejects, with its reason, and still reports a range', async () => {
    const { probe } = fakeProbe({ reject: ['charges'] })
    const r = await measureSensitivity(probe)
    expect(r.skipped).toEqual([{ condition: 'charges', reason: expect.stringContaining('rejected') }])
    expect(r.range).toEqual({ min: 1000, max: 1300 })
  })

  it('gives no range, only a reason, when every condition fails', async () => {
    const { probe } = fakeProbe({ reject: DEFAULT_CONDITIONS.map((c) => c.id) })
    const r = await measureSensitivity(probe)
    expect(r.range).toBeNull()
    expect(r.unknownReason).toMatch(/single reading/)
  })

  it('halts and discards the reading when the build is not restored', async () => {
    const { probe, log } = fakeProbe({ leaky: 'chilled' })
    const r = await measureSensitivity(probe)
    expect(r.halted).toBe(true)
    expect(r.warnings.join(' ')).toMatch(/not restored/)
    expect(r.readings.map((x) => x.condition)).toEqual(['shocked'])
    expect(r.skipped.some((s) => s.condition === 'chilled')).toBe(true)
    expect(log.filter((l) => l.startsWith('apply'))).toHaveLength(2) // never reached ignited
  })

  it('halts when restore itself throws', async () => {
    const { probe } = fakeProbe({ failRestore: 'shocked' })
    const r = await measureSensitivity(probe)
    expect(r.halted).toBe(true)
    expect(r.readings).toEqual([])
    expect(r.range).toBeNull()
  })

  it('is unknown when the baseline cannot be read', async () => {
    const probe: SensitivityProbe = {
      apply: async () => {},
      restore: async () => {},
      measure: async () => {
        throw new Error('PoB not running')
      },
    }
    const r = await measureSensitivity(probe)
    expect(r.range).toBeNull()
    expect(r.unknownReason).toMatch(/baseline/)
  })

  it('is unknown when the metric is not numeric', async () => {
    const probe: SensitivityProbe = { apply: async () => {}, restore: async () => {}, measure: async () => ({}) }
    const r = await measureSensitivity(probe, { metric: 'CombinedDPS' })
    expect(r.unknownReason).toMatch(/CombinedDPS/)
  })
})

describe('bridgeProbe', () => {
  it('sets inputs, recalculates, and puts the previous values back', async () => {
    const inputs: Record<string, unknown> = { conditionEnemyShocked: false }
    const calls: string[] = []
    const transport: PobTransport = async (_port, payload) => {
      const req = JSON.parse(payload) as { id: number; method: string; params: { name?: string; value?: unknown } }
      calls.push(req.method)
      let result: unknown = {}
      if (req.method === 'get_config_input') result = { value: inputs[req.params.name!] }
      else if (req.method === 'set_config_input') inputs[req.params.name!] = req.params.value
      else if (req.method === 'get_calcs') result = { TotalDPS: inputs.conditionEnemyShocked === true ? 1200 : 1000 }
      return `${JSON.stringify({ jsonrpc: '2.0', id: req.id, result })}\n`
    }
    const r = await measureSensitivity(bridgeProbe(new PobBridge({ transport })), {
      conditions: DEFAULT_CONDITIONS.filter((c) => c.id === 'shocked'),
    })
    expect(r.range).toEqual({ min: 1000, max: 1200 })
    expect(inputs.conditionEnemyShocked).toBe(false)
    expect(calls).toContain('set_config_input')
  })

  it('reports not measurable when the addon has no such method', async () => {
    const transport: PobTransport = async (_p, payload) => {
      const req = JSON.parse(payload) as { id: number; method: string }
      return req.method === 'get_calcs'
        ? `${JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { TotalDPS: 1000 } })}\n`
        : `${JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { message: 'unknown method' } })}\n`
    }
    const r = await measureSensitivity(bridgeProbe(new PobBridge({ transport })))
    expect(r.range).toBeNull()
    expect(r.skipped.every((s) => /Not measurable/.test(s.reason))).toBe(true)
  })
})

describe('measureSensitivity baseline gate', () => {
  it('reports no readings and halts when the baseline does not reproduce poe.ninja', async () => {
    const { probe, log } = fakeProbe()
    const r = await measureSensitivity(probe, { expected: [{ label: 'Main skill DPS', expected: 800, simulatedKeys: ['TotalDPS'] }] })
    expect(r.readings).toEqual([])
    expect(r.range).toBeNull()
    expect(r.halted).toBe(true)
    expect(r.unknownReason).toContain('Main skill DPS')
    expect(log).toEqual([])
  })

  it('proceeds when the baseline reproduces', async () => {
    const { probe } = fakeProbe()
    const r = await measureSensitivity(probe, { expected: [{ label: 'Main skill DPS', expected: 1000, simulatedKeys: ['TotalDPS'] }] })
    expect(r.baselineGate?.ok).toBe(true)
    expect(r.range).toEqual({ min: 1000, max: 1500 })
  })
})
