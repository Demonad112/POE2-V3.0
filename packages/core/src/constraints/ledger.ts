/**
 * Cumulative constraint ledger.
 *
 * A recommendation that is safe alone can be unsafe beside another: two swaps
 * that each give up "wasted" fire resistance spend the same overcap twice. The
 * ledger takes the character's current totals plus every proposed change and
 * returns the totals after all of them, with the constraints that break.
 *
 * Pure arithmetic. Nothing is estimated:
 *  - a total the payload does not carry is `null`, and a change touching it is
 *    reported as `unchecked`, never assumed safe;
 *  - a delta may be a range (a crafted roll is a range), and the result is a
 *    range. A constraint breaks if the WORST case breaks it.
 *
 * A "floor" is the value the stat must not fall below: the resistance cap for
 * a resistance (using the real uncapped total, so overcap counts as slack), the
 * attribute requirement for an attribute, zero spare Spirit for Spirit.
 */

import type { DefenseSummary } from '../defense/index.js'
import type { HoldingUpMap } from './holding-up.js'

export type LedgerStat =
  | 'fireResistance'
  | 'coldResistance'
  | 'lightningResistance'
  | 'chaosResistance'
  | 'spirit'
  | 'strength'
  | 'dexterity'
  | 'intelligence'
  | 'movementSpeed'

export interface LedgerTotal {
  /** Current total, uncapped for resistances. Null when the payload does not carry it. */
  value: number | null
  /** The value it must stay at or above. Null for a stat with no hard floor (movement speed). */
  floor: number | null
  /** Where the total and floor came from, for display. */
  source: string
}

export type LedgerTotals = Partial<Record<LedgerStat, LedgerTotal>>

export type LedgerAmount = number | { min: number; max: number }

export interface LedgerChange {
  id: string
  label: string
  deltas: Partial<Record<LedgerStat, LedgerAmount>>
}

export type LedgerViolationKind =
  /** Was at or above its floor; the changes together take it below. */
  | 'breaks-floor'
  /** Was already below its floor; the changes take it lower. */
  | 'worsens-shortfall'
  /** No hard floor, but the changes lower it. */
  | 'lowers'

export interface LedgerViolation {
  stat: LedgerStat
  kind: LedgerViolationKind
  before: number
  /** Worst-case total after every change. */
  afterWorst: number
  /** Best-case total after every change. */
  afterBest: number
  floor: number | null
  /** Ids of the changes that move this stat, in the order given. */
  changes: string[]
  message: string
}

export interface LedgerResult {
  /** Totals after every change, as a range. Null for a stat whose current total is unknown. */
  after: Partial<Record<LedgerStat, { min: number; max: number } | null>>
  violations: LedgerViolation[]
  /** Stats a change touches but whose current total is unknown, so nothing could be checked. */
  unchecked: { stat: LedgerStat; changes: string[]; reason: string }[]
}

const range = (a: LedgerAmount) => (typeof a === 'number' ? { min: a, max: a } : a)

const NAMES: Record<LedgerStat, string> = {
  fireResistance: 'Fire resistance',
  coldResistance: 'Cold resistance',
  lightningResistance: 'Lightning resistance',
  chaosResistance: 'Chaos resistance',
  spirit: 'Spare Spirit',
  strength: 'Strength',
  dexterity: 'Dexterity',
  intelligence: 'Intelligence',
  movementSpeed: 'Movement speed',
}

export function ledgerStatName(stat: LedgerStat): string {
  return NAMES[stat]
}

export function applyLedger(totals: LedgerTotals, changes: readonly LedgerChange[]): LedgerResult {
  const touched = new Map<LedgerStat, { min: number; max: number; ids: string[] }>()
  for (const change of changes) {
    for (const [stat, amount] of Object.entries(change.deltas) as [LedgerStat, LedgerAmount][]) {
      const r = range(amount)
      const cur = touched.get(stat) ?? { min: 0, max: 0, ids: [] }
      cur.min += r.min
      cur.max += r.max
      cur.ids.push(change.id)
      touched.set(stat, cur)
    }
  }

  const result: LedgerResult = { after: {}, violations: [], unchecked: [] }

  for (const [stat, sum] of touched) {
    const total = totals[stat]
    if (!total || total.value === null) {
      result.after[stat] = null
      result.unchecked.push({
        stat,
        changes: sum.ids,
        reason: `The current ${NAMES[stat].toLowerCase()} total is not known, so the combined effect of these changes cannot be checked.`,
      })
      continue
    }

    const worst = total.value + sum.min
    const best = total.value + sum.max
    result.after[stat] = { min: worst, max: best }

    const floor = total.floor
    let kind: LedgerViolationKind | null = null
    if (floor !== null) {
      if (total.value >= floor && worst < floor) kind = 'breaks-floor'
      else if (total.value < floor && worst < total.value) kind = 'worsens-shortfall'
    } else if (worst < total.value) {
      kind = 'lowers'
    }
    if (!kind) continue

    const name = NAMES[stat]
    const where = worst === best ? `${worst}` : `${worst} to ${best}`
    const message =
      kind === 'breaks-floor'
        ? `This takes ${name.toLowerCase()} from ${total.value} to ${where}, below the ${floor} floor.`
        : kind === 'worsens-shortfall'
          ? `This takes ${name.toLowerCase()} from ${total.value} to ${where}, further below the ${floor} floor.`
          : `This lowers ${name.toLowerCase()} from ${total.value} to ${where}.`
    result.violations.push({
      stat,
      kind,
      before: total.value,
      afterWorst: worst,
      afterBest: best,
      floor,
      changes: sum.ids,
      message,
    })
  }
  return result
}

/**
 * Totals for the ledger from the resistances alone. Uncapped total is the
 * capped value plus poe.ninja's over-cap points; the floor is the cap.
 */
export function resistanceTotals(defense: Pick<DefenseSummary, 'resistances'>): LedgerTotals {
  const out: LedgerTotals = {}
  for (const r of defense.resistances) {
    out[`${r.type}Resistance` as LedgerStat] = {
      value: r.value === null || r.overCap === null ? null : r.value + r.overCap,
      floor: r.max,
      source: 'poe.ninja',
    }
  }
  return out
}

/** Every total the holding-up map carries: resistances, Spirit, attributes and movement speed. */
export function ledgerTotalsFromHoldingUp(map: HoldingUpMap): LedgerTotals {
  const out: LedgerTotals = {}
  for (const r of map.resistances) {
    out[`${r.type}Resistance` as LedgerStat] = {
      value: r.known && r.value !== null && r.slack !== null ? r.value + r.slack : null,
      floor: r.max,
      source: 'poe.ninja',
    }
  }
  if (map.spirit.value) {
    out.spirit = { value: map.spirit.value.unreserved, floor: 0, source: 'pob-export' }
  }
  for (const a of map.attributes.value) {
    out[a.attribute] = { value: a.have, floor: a.required, source: 'pob-export' }
  }
  out.movementSpeed = { value: map.movementSpeed.value, floor: null, source: 'poe.ninja' }
  return out
}
