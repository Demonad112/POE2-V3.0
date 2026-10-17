import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { unwrapCharModel } from '../src/analyze.js'
import { analyzeDefense } from '../src/defense/index.js'
import { analyzePob } from './helpers/pob.js'
import { reconcile } from '../src/reconcile/index.js'

const model = unwrapCharModel(
  JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/athrynas-v43.json', import.meta.url)), 'utf8')),
)

describe('evade chance', () => {
  it('is poe.ninja’s figure, and unknown rather than 0 when the payload has none', () => {
    expect(analyzeDefense(model).evadeChance).toBe(model.defensiveStats?.evadeChance)
    expect(analyzeDefense({ defensiveStats: { life: 100 } }).evadeChance).toBeNull()
  })

  it('is reconciled against the export’s EvadeChance', async () => {
    const stats = await analyzePob(model)
    const evade = reconcile(model, stats).checks.find((c) => c.stat === 'evadeChance')!
    expect(evade.otherSource).toBe('pob-export')
    expect(evade.ninja).toBe(41)
    expect(evade.other).toBe(41)
    expect(evade.severity).toBe('match')
  })

  it('is unresolved, not a disagreement, when there is no export', () => {
    expect(reconcile(model, {}).checks.find((c) => c.stat === 'evadeChance')!.severity).toBe('unresolved')
  })
})
