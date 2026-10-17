/**
 * What poe.ninja's elemental maximum hits imply about resistance.
 *
 * INFERENCE, labelled `derived`. For a character whose only defence is its
 * life and energy shield pool, a hit of size H that just kills satisfies
 *
 *     H = pool / (1 - resistance)        so        resistance = 1 - pool / H
 *
 * On the Yykiuy evidence pack the pool is 1,111 + 610 = 1,721, equal to the
 * physical maximum hit, and the elemental max hits 6,146 / 5,062 / 6,374 imply
 * resistances 72 / 66 / 73 where the sheet shows 75 / 69 / 76 (capped).
 *
 * The formula is only valid when nothing else mitigates the hit. So it is used
 * only when the physical maximum hit equals the pool within rounding, which
 * says armour and the like did nothing. Otherwise the answer is `unknown`, with
 * the reason, rather than a number resting on an assumption the data refutes.
 * Chaos is never inferred: it does not take the same pool.
 *
 * Reading: the gap is not explained here. A lower implied resistance than the
 * sheet is consistent with poe.ninja assuming a resistance penalty that the
 * displayed figure does not include; that cause is an inference too.
 */

import type { DamageType } from '../model/types.js'

export type ImpliedResistanceType = Exclude<DamageType, 'physical' | 'chaos'>

export interface ImpliedResistance {
  type: ImpliedResistanceType
  status: 'implied' | 'unknown'
  /** Implied resistance, percent, as a range covering integer rounding. Null when unknown. */
  implied: { min: number; max: number } | null
  /** What the sheet shows, percent. */
  displayed: number | null
  /** displayed minus implied, as a range. Null when unknown. */
  gap: { min: number; max: number } | null
  reason: string | null
}

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Resistance implied by a hit pool and the maximum hit, percent, as a range.
 * Inputs are whole numbers, so each is allowed half a unit of rounding.
 */
export function impliedResistance(pool: number, maxHit: number): { min: number; max: number } | null {
  if (!(pool > 0) || !(maxHit > 0)) return null
  const lo = 100 * (1 - (pool + 1) / (maxHit - 0.5))
  const hi = 100 * (1 - (pool - 1) / (maxHit + 0.5))
  return { min: round1(lo), max: round1(hi) }
}

export interface ImpliedInput {
  life: number | null
  energyShield: number | null
  physicalMaxHit: number | null
  maxHits: Partial<Record<ImpliedResistanceType, number | null>>
  displayed: Partial<Record<ImpliedResistanceType, number | null>>
}

const TYPES: ImpliedResistanceType[] = ['fire', 'cold', 'lightning']

export function impliedResistances(input: ImpliedInput): ImpliedResistance[] {
  const { life, energyShield, physicalMaxHit } = input
  const unknown = (type: ImpliedResistanceType, reason: string): ImpliedResistance => ({
    type,
    status: 'unknown',
    implied: null,
    displayed: input.displayed[type] ?? null,
    gap: null,
    reason,
  })

  if (life === null || energyShield === null) {
    return TYPES.map((t) => unknown(t, 'Life or energy shield is not reported, so the hit pool is unknown.'))
  }
  const pool = life + energyShield
  if (physicalMaxHit === null || Math.abs(physicalMaxHit - pool) > 2) {
    return TYPES.map((t) =>
      unknown(
        t,
        `The physical maximum hit (${physicalMaxHit ?? 'not reported'}) is not the life + energy shield pool (${pool}), so other mitigation applies and resistance cannot be inferred from the elemental hits.`,
      ),
    )
  }

  return TYPES.map((type) => {
    const hit = input.maxHits[type] ?? null
    const shown = input.displayed[type] ?? null
    if (hit === null) return unknown(type, `No ${type} maximum hit is reported.`)
    const implied = impliedResistance(pool, hit)
    if (!implied) return unknown(type, 'The maximum hit is not a positive number.')
    return {
      type,
      status: 'implied',
      implied,
      displayed: shown,
      gap: shown === null ? null : { min: round1(shown - implied.max), max: round1(shown - implied.min) },
      reason: null,
    }
  })
}
