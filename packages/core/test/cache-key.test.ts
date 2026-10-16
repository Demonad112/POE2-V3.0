import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { analysisCacheKey, canonicalJson } from '../src/cache/key.js'
import { unwrapCharModel } from '../src/analyze.js'

const model = unwrapCharModel(
  JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/athrynas-v43.json', import.meta.url)), 'utf8')),
) as Record<string, unknown>
const input = { model, pobVersion: '2.55.0', dataVersion: '0.5.5' }

describe('canonicalJson', () => {
  it('ignores key order, drops undefined, maps non-finite numbers to null', () => {
    expect(canonicalJson({ b: 1, a: [2, { d: undefined, c: Number.NaN }] })).toBe('{"a":[2,{"c":null}],"b":1}')
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }))
  })
})

describe('analysisCacheKey', () => {
  it('is a stable 64-char hex digest', async () => {
    const a = await analysisCacheKey(input)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await analysisCacheKey({ ...input, model: { ...model } })).toBe(a)
  })

  it('ignores timestamps poe.ninja refreshes without the character changing', async () => {
    const a = await analysisCacheKey(input)
    const b = await analysisCacheKey({ ...input, model: { ...model, lastCheckedUtc: 'x', lastSeenUtc: 'y', updatedUtc: 'z' } })
    expect(b).toBe(a)
  })

  it('changes with character content, PoB version, data version and engine version', async () => {
    const a = await analysisCacheKey(input)
    const level = typeof model.level === 'number' ? model.level : 0
    expect(await analysisCacheKey({ ...input, model: { ...model, level: level + 1 } })).not.toBe(a)
    expect(await analysisCacheKey({ ...input, pobVersion: '2.56.0' })).not.toBe(a)
    expect(await analysisCacheKey({ ...input, pobVersion: null })).not.toBe(a)
    expect(await analysisCacheKey({ ...input, dataVersion: '0.5.6' })).not.toBe(a)
    expect(await analysisCacheKey({ ...input, engineVersion: 99 })).not.toBe(a)
  })
})
