/**
 * Trade search query builder. Pure: builds a JSON object, makes no request.
 *
 * Encodes what a replacement item must keep (from `holdingUp`) plus the mods
 * the player wants, in three variants:
 *
 *  - `exact`       every wanted mod required.
 *  - `wider`       at least all-but-one of the wanted mods.
 *  - `best-value`  at least one wanted mod.
 *
 * Required-to-keep minimums are always hard filters in every variant, because
 * relaxing them drops a resistance under its cap. The relaxation is structural
 * (how many of the wanted mods must match); no percentages are invented.
 *
 * The trade site identifies stats by its own ids, which this repo's data does
 * not carry. The caller injects the mapping; a stat with no mapping is
 * reported in `unmapped` and left out of the query, never guessed.
 *
 * The query shape follows the public trade API's conventions and has NOT been
 * verified against the live site from here.
 */

import type { HoldingUpMap } from '../constraints/holding-up.js'
import { RESIST_STAT } from '../gear/analyze.js'

/** Internal stat id (e.g. `base_fire_damage_resistance_%`) to trade stat id. */
export type TradeStatMap = Readonly<Record<string, string>>

export interface StatRequirement {
  /** Internal stat id, as used by the mod data. */
  statId: string
  min: number
}

export interface TradeTarget {
  /** Base type name, when the search should be limited to it. */
  baseType?: string
  /** Minimums that keep the build as it is (never relaxed). */
  mustKeep: StatRequirement[]
  /** Mods the player wants on top. */
  wanted: StatRequirement[]
}

export type TradeVariantName = 'exact' | 'wider' | 'best-value'

export interface TradeFilter {
  id: string
  value: { min: number }
  disabled: false
}

export interface TradeStatGroup {
  type: 'and' | 'count'
  value?: { min: number }
  filters: TradeFilter[]
}

export interface TradeQuery {
  query: {
    status: { option: 'online' }
    type?: string
    stats: TradeStatGroup[]
  }
  sort: { price: 'asc' }
}

export interface TradeVariant {
  name: TradeVariantName
  query: TradeQuery
  /** Requirements dropped because no trade stat id was supplied for them. */
  unmapped: { statId: string; reason: string }[]
  assumptions: string[]
}

function split(reqs: StatRequirement[], map: TradeStatMap) {
  const filters: TradeFilter[] = []
  const unmapped: TradeVariant['unmapped'] = []
  for (const r of reqs) {
    const id = map[r.statId]
    if (!id) {
      unmapped.push({ statId: r.statId, reason: 'No trade stat id was supplied for this stat, so it is not in the query.' })
      continue
    }
    filters.push({ id, value: { min: r.min }, disabled: false })
  }
  return { filters, unmapped }
}

export function buildTradeQueries(target: TradeTarget, map: TradeStatMap): TradeVariant[] {
  const keep = split(target.mustKeep, map)
  const want = split(target.wanted, map)
  const n = want.filters.length

  const make = (name: TradeVariantName, wantedGroup: TradeStatGroup | null, note: string): TradeVariant => {
    const stats: TradeStatGroup[] = []
    if (keep.filters.length) stats.push({ type: 'and', filters: keep.filters })
    if (wantedGroup) stats.push(wantedGroup)
    return {
      name,
      query: {
        query: { status: { option: 'online' }, ...(target.baseType ? { type: target.baseType } : {}), stats },
        sort: { price: 'asc' },
      },
      unmapped: [...keep.unmapped, ...want.unmapped],
      assumptions: [
        'Minimums are the values an item must provide so the build does not get worse; they come from the current gear and sheet.',
        note,
        'Prices are not estimated; results are sorted by listed price only.',
      ],
    }
  }

  return [
    make(
      'exact',
      n ? { type: 'and', filters: want.filters } : null,
      'Every wanted mod must be present at its minimum.',
    ),
    make(
      'wider',
      n ? { type: 'count', value: { min: Math.max(1, n - 1) }, filters: want.filters } : null,
      'At least all but one of the wanted mods must be present.',
    ),
    make(
      'best-value',
      n ? { type: 'count', value: { min: 1 }, filters: want.filters } : null,
      'At least one wanted mod must be present; compare listings on price.',
    ),
  ]
}

const RESIST_TYPES = Object.keys(RESIST_STAT)

/**
 * The hard minimums for replacing the item in `slotId`: each capped stat the
 * item holds up, at the amount that keeps the sheet from getting worse.
 * Stats with no breakpoint (`minToKeep` null) or no requirement (0) are omitted.
 */
export function constraintsFromHoldingUp(map: HoldingUpMap, slotId: number): StatRequirement[] {
  const row = map.items.find((i) => i.slotId === slotId)
  if (!row) return []
  const out: StatRequirement[] = []
  for (const h of row.holds) {
    if (h.minToKeep === null || h.minToKeep <= 0) continue
    const type = h.stat.replace('Resistance', '')
    if (!RESIST_TYPES.includes(type)) continue
    out.push({ statId: RESIST_STAT[type]!, min: h.minToKeep })
  }
  return out
}
