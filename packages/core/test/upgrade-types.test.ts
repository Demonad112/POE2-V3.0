import { describe, expect, it } from 'vitest'
import { buildTradeoffLine } from '../src/upgrade/tradeoff.js'
import { isSimulated, type ObservedCard, type SimulatedCard, type UpgradeCard } from '../src/upgrade/types.js'
import { scoreUpgrade } from '../src/upgrade/scoring.js'

const score = scoreUpgrade({ dps: 1, lowestMaxHit: 1, ehp: 1 }, { dps: 1, lowestMaxHit: 1, ehp: 1 }, { mode: 'bossing' })
const common: Omit<ObservedCard, 'source'> = {
  id: 'x',
  slotId: 8,
  slotLabel: 'Ring 1',
  itemName: 'Test Ring',
  gain: { damage: { kind: 'unknown', reason: 'n/a' }, survivability: { kind: 'unknown', reason: 'n/a' } },
  tradeoff: null,
  mods: [],
  assumptions: [],
  rarityLabel: null,
  score,
}

describe('buildTradeoffLine', () => {
  it('lists only what is given up', () => {
    expect(
      buildTradeoffLine([
        { label: 'damage', value: 4.2, unit: '%' },
        { label: 'survivability', value: -0.64, unit: '%' },
        { label: 'mana', value: -33, unit: '' },
      ]),
    ).toBe('-0.6% survivability, -33 mana')
  })
  it('is null when nothing is lost or values are not finite', () => {
    expect(buildTradeoffLine([{ label: 'damage', value: 1, unit: '%' }])).toBeNull()
    expect(buildTradeoffLine([{ label: 'x', value: Number.NaN, unit: '' }])).toBeNull()
    expect(buildTradeoffLine([])).toBeNull()
  })
})

describe('card source typing', () => {
  it('a simulated card needs simulation metadata; an observed card cannot carry it', () => {
    // @ts-expect-error pob-sim without simulation metadata
    const bad: SimulatedCard = { ...common, source: 'pob-sim' }
    // @ts-expect-error observed card with simulation metadata
    const bad2: ObservedCard = { ...common, source: 'ninja', simulation: { pobVersion: 'x', configHash: 'y', conditions: [] } }
    expect([bad, bad2]).toHaveLength(2)

    const sim: UpgradeCard = { ...common, source: 'pob-sim', simulation: { pobVersion: '2.x', configHash: 'h', conditions: [] } }
    const obs: UpgradeCard = { ...common, source: 'ninja' }
    expect(isSimulated(sim)).toBe(true)
    expect(isSimulated(obs)).toBe(false)
  })
})
