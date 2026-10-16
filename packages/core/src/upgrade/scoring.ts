/**
 * Mode and priority scoring for an upgrade.
 *
 *   score = w_d * ln(D1/D0) + w_s * ln(S1/S0) [+ w_c * ln(C1/C0), mapping only]
 *
 * A log-ratio, so independent multiplicative gains add: +10% damage and +10%
 * survivability score the same as one change that does both.
 *
 * ## Survivability
 *
 * Defined as the weighted geometric mean of the smallest maximum hit taken and
 * the effective health pool:
 *
 *   S = maxHit^h * EHP^(1-h)
 *
 * The repo leads with the hit that kills because EHP overstates survivability
 * (about 3.5x on the reference character), so the hit carries real weight in
 * both modes. Bossing weights it most (a pinnacle boss kills with a hit);
 * mapping weights pool depth more (many small hits, recovery between packs).
 *
 * ## What is judgement
 *
 * `HIT_WEIGHT`, `PRIORITY_WEIGHTS` and `CLEAR_WEIGHT` are policy choices, not
 * measurements, and are declared here the way `thresholds.ts` declares its
 * judgements. Callers may override them. They are not data and are never
 * shown as such.
 *
 * ## Missing data
 *
 * A single number is only produced when every scored component was measured.
 * A component given as a [min,max] interval (for example from sensitivity
 * runs) yields a range. A component with no usable figures yields `unknown`
 * carrying whatever the known components contribute.
 */

export type ScoreMode = 'mapping' | 'bossing'
export type ScorePriority = 'balanced' | 'damage' | 'defence'

/** Share of survivability taken from the smallest max hit; the rest comes from EHP. */
export const HIT_WEIGHT: Readonly<Record<ScoreMode, number>> = Object.freeze({ mapping: 0.25, bossing: 0.75 })

export const PRIORITY_WEIGHTS: Readonly<Record<ScorePriority, { damage: number; survivability: number }>> =
  Object.freeze({
    balanced: { damage: 0.5, survivability: 0.5 },
    damage: { damage: 0.75, survivability: 0.25 },
    defence: { damage: 0.25, survivability: 0.75 },
  })

/** Weight of clear speed (movement speed x area) in mapping. Not renormalised. */
export const CLEAR_WEIGHT = 0.25

export interface Interval {
  min: number
  max: number
}

/** A figure that is known exactly, known to lie in a range, or not known. */
export type Quantity = number | Interval | null

export interface ScoreProfile {
  /** Hit DPS of the skill being scored. */
  dps: Quantity
  /** poe.ninja's lowestMaximumHitTaken (or the PoB equivalent). */
  lowestMaxHit: Quantity
  /** Effective health pool. */
  ehp: Quantity
  movementSpeed?: Quantity
  /** Area radius of the main skill; area scales with its square. */
  aoeRadius?: Quantity
}

export interface ScorePart {
  component: 'damage' | 'survivability' | 'clear'
  weight: number
  logRatio: Interval
}

interface ScoreBase {
  parts: ScorePart[]
  /** Components left out because their inputs were not available. */
  unscored: string[]
}

export type ScoreResult =
  | ({ kind: 'point'; value: number } & ScoreBase)
  | ({ kind: 'range'; min: number; max: number } & ScoreBase)
  | ({ kind: 'unknown'; reason: string; knownPart: Interval | null } & ScoreBase)

export interface ScoreOptions {
  mode: ScoreMode
  priority?: ScorePriority
  hitWeight?: number
  weights?: { damage: number; survivability: number }
  clearWeight?: number
}

function interval(q: Quantity | undefined): Interval | null {
  if (q === null || q === undefined) return null
  const lo = typeof q === 'number' ? q : q.min
  const hi = typeof q === 'number' ? q : q.max
  if (![lo, hi].every((n) => Number.isFinite(n) && n > 0) || lo > hi) return null
  return { min: lo, max: hi }
}

/** ln(after/before) as an interval; null when either side is unusable. */
function logRatio(before: Quantity | undefined, after: Quantity | undefined): Interval | null {
  const b = interval(before)
  const a = interval(after)
  if (!b || !a) return null
  return { min: Math.log(a.min / b.max), max: Math.log(a.max / b.min) }
}

const scale = (i: Interval, w: number): Interval => ({ min: i.min * w, max: i.max * w })
const add = (a: Interval, b: Interval): Interval => ({ min: a.min + b.min, max: a.max + b.max })

export function scoreUpgrade(before: ScoreProfile, after: ScoreProfile, options: ScoreOptions): ScoreResult {
  const weights = options.weights ?? PRIORITY_WEIGHTS[options.priority ?? 'balanced']
  const h = options.hitWeight ?? HIT_WEIGHT[options.mode]
  const parts: ScorePart[] = []
  const unscored: string[] = []
  const missing: string[] = []

  const damage = logRatio(before.dps, after.dps)
  if (damage) parts.push({ component: 'damage', weight: weights.damage, logRatio: damage })
  else missing.push('damage (DPS before or after is missing or not positive)')

  const hit = logRatio(before.lowestMaxHit, after.lowestMaxHit)
  const pool = logRatio(before.ehp, after.ehp)
  if (hit && pool) {
    const survival = add(scale(hit, h), scale(pool, 1 - h))
    parts.push({ component: 'survivability', weight: weights.survivability, logRatio: survival })
  } else {
    missing.push('survivability (needs both the smallest max hit and EHP, before and after)')
  }

  if (options.mode === 'mapping') {
    const move = logRatio(before.movementSpeed, after.movementSpeed)
    const radius = logRatio(before.aoeRadius, after.aoeRadius)
    if (move && radius) {
      parts.push({
        component: 'clear',
        weight: options.clearWeight ?? CLEAR_WEIGHT,
        logRatio: add(move, scale(radius, 2)),
      })
    } else {
      unscored.push('clear speed (needs movement speed and area radius, before and after)')
    }
  }

  const total = parts.reduce<Interval>(
    (acc, p) => add(acc, scale(p.logRatio, p.weight)),
    { min: 0, max: 0 },
  )

  if (missing.length) {
    return {
      kind: 'unknown',
      reason: `Not scored: ${missing.join('; ')}.`,
      knownPart: parts.length ? total : null,
      parts,
      unscored: [...unscored, ...missing],
    }
  }
  if (total.min === total.max) return { kind: 'point', value: total.min, parts, unscored }
  return { kind: 'range', min: total.min, max: total.max, parts, unscored }
}

/**
 * Sum scores across slots. Valid because log-ratios of independent
 * multiplicative gains add; whether the gains really are independent is NOT
 * checked, so the result says it was not jointly simulated.
 */
export function combineScores(scores: ScoreResult[]): { result: ScoreResult; jointlySimulated: false } {
  const parts = scores.flatMap((s) => s.parts)
  const unscored = scores.flatMap((s) => s.unscored)
  const known = scores.reduce<Interval>(
    (acc, s) => {
      if (s.kind === 'point') return add(acc, { min: s.value, max: s.value })
      if (s.kind === 'range') return add(acc, { min: s.min, max: s.max })
      return s.knownPart ? add(acc, s.knownPart) : acc
    },
    { min: 0, max: 0 },
  )
  const unknown = scores.find((s) => s.kind === 'unknown')
  if (unknown) {
    return {
      result: { kind: 'unknown', reason: 'At least one upgrade could not be scored.', knownPart: known, parts, unscored },
      jointlySimulated: false,
    }
  }
  const result: ScoreResult =
    known.min === known.max
      ? { kind: 'point', value: known.min, parts, unscored }
      : { kind: 'range', min: known.min, max: known.max, parts, unscored }
  return { result, jointlySimulated: false }
}
