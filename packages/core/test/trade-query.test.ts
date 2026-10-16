import { describe, expect, it } from 'vitest'
import { buildTradeQueries, constraintsFromHoldingUp, type TradeStatMap } from '../src/trade/query.js'
import type { HoldingUpMap } from '../src/constraints/holding-up.js'

const map: TradeStatMap = { 'base_fire_damage_resistance_%': 'explicit.fake_fire', 'base_life': 'explicit.fake_life' }

describe('buildTradeQueries', () => {
  it('builds exact, wider and best-value variants', () => {
    const v = buildTradeQueries(
      {
        baseType: 'Ruby Ring',
        mustKeep: [{ statId: 'base_fire_damage_resistance_%', min: 31 }],
        wanted: [
          { statId: 'base_life', min: 60 },
          { statId: 'unknown_stat', min: 5 },
          { statId: 'base_life', min: 80 },
        ],
      },
      map,
    )
    expect(v.map((x) => x.name)).toEqual(['exact', 'wider', 'best-value'])
    expect(v[0]!.query).toMatchInlineSnapshot(`
      {
        "query": {
          "stats": [
            {
              "filters": [
                {
                  "disabled": false,
                  "id": "explicit.fake_fire",
                  "value": {
                    "min": 31,
                  },
                },
              ],
              "type": "and",
            },
            {
              "filters": [
                {
                  "disabled": false,
                  "id": "explicit.fake_life",
                  "value": {
                    "min": 60,
                  },
                },
                {
                  "disabled": false,
                  "id": "explicit.fake_life",
                  "value": {
                    "min": 80,
                  },
                },
              ],
              "type": "and",
            },
          ],
          "status": {
            "option": "online",
          },
          "type": "Ruby Ring",
        },
        "sort": {
          "price": "asc",
        },
      }
    `)
    expect(v[1]!.query.query.stats[1]).toMatchObject({ type: 'count', value: { min: 1 } }) // n=2 -> max(1, 1)
    expect(v[2]!.query.query.stats[1]).toMatchObject({ type: 'count', value: { min: 1 } })
  })

  it('keeps the must-keep group as a hard "and" in every variant', () => {
    for (const v of buildTradeQueries({ mustKeep: [{ statId: 'base_life', min: 10 }], wanted: [] }, map)) {
      expect(v.query.query.stats).toEqual([{ type: 'and', filters: [{ id: 'explicit.fake_life', value: { min: 10 }, disabled: false }] }])
    }
  })

  it('wider requires all-but-one when there are three wanted mods', () => {
    const w = [1, 2, 3].map((min) => ({ statId: 'base_life', min }))
    const wider = buildTradeQueries({ mustKeep: [], wanted: w }, map)[1]!
    expect(wider.query.query.stats[0]).toMatchObject({ type: 'count', value: { min: 2 } })
  })

  it('reports unmapped stats instead of guessing an id', () => {
    const v = buildTradeQueries({ mustKeep: [{ statId: 'nope', min: 1 }], wanted: [] }, {})
    expect(v[0]!.unmapped).toEqual([{ statId: 'nope', reason: expect.stringMatching(/No trade stat id/) }])
    expect(v[0]!.query.query.stats).toEqual([])
  })
})

describe('constraintsFromHoldingUp', () => {
  const holding = {
    items: [
      {
        slotId: 8,
        holds: [
          { stat: 'fireResistance', minToKeep: 31 },
          { stat: 'coldResistance', minToKeep: 0 },
          { stat: 'life', minToKeep: null },
        ],
      },
    ],
  } as unknown as HoldingUpMap

  it('emits only capped resistances with a positive minimum', () => {
    expect(constraintsFromHoldingUp(holding, 8)).toEqual([{ statId: 'base_fire_damage_resistance_%', min: 31 }])
  })
  it('is empty for a slot with no row', () => {
    expect(constraintsFromHoldingUp(holding, 99)).toEqual([])
  })
})
