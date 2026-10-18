/**
 * Defence analysis.
 *
 * CORRECTNESS RULE: lead with `lowestMaximumHitTaken`, not `effectiveHealthPool`.
 * On the reference character EHP reads 13,569 while a 3,808 chaos hit kills —
 * EHP overstates survivability by ~3.5x. Reporting the average as the headline
 * is how a build that dies to one chaos slam gets called tanky.
 *
 * Everything here reads poe.ninja's computed values (Tier 1). The Tier 3
 * formulas in ./constants.ts are used only for projection and reconciliation.
 */

import type { CharModel, DamageType, NinjaDefensiveStats } from '../model/types.js'
import { DAMAGE_TYPES } from '../model/types.js'
import { RES_CAP_DEFAULT, armourDamageReduction, chaosRawPool } from './constants.js'
import { impliedResistances, type ImpliedResistance } from './implied.js'

export interface MaxHit {
  type: DamageType
  /** Largest single hit of this type that is survivable. */
  value: number
  /** True for the type that kills first. */
  isLowest: boolean
  /** How much larger the safest vector is than this one. */
  ratioToHighest: number
}

export interface ResistanceState {
  type: Exclude<DamageType, 'physical'>
  /** Null when the payload did not report this resistance. Never 0 for unknown. */
  value: number | null
  max: number
  /** Points above the cap — wasted, and reallocatable. Null when unknown. */
  overCap: number | null
  /** Points below the cap. 0 when capped. Null when the value is unknown. */
  underCap: number | null
  /** Null when the value is unknown. */
  capped: boolean | null
}

export interface DefenseSummary {
  /** The survivability headline: the smallest max hit across all types. */
  lowestMaximumHit: number | null
  /** Which damage type that is. Null when the payload didn't say. */
  lowestMaximumHitType: DamageType | null
  /** poe.ninja's averaged pool. Reported, but never led with. */
  effectiveHealthPool: number | null
  /** How much EHP overstates the true one-shot threshold. */
  ehpOverstatementRatio: number | null

  maxHits: MaxHit[]
  resistances: ResistanceState[]
  /**
   * Resistance implied by poe.ninja's elemental maximum hits (`derived`, an
   * inference: see ./implied.ts). Unknown whenever other mitigation applies.
   */
  impliedResistances: ImpliedResistance[]

  /** Null when the payload did not report it. */
  life: number | null
  /** Null when the payload did not report it. */
  energyShield: number | null
  /** Null when the payload did not report it (0.5 mechanic; absent is not the same as zero). */
  ward: number | null
  /** Pool against chaos: chaos drains ES at 2x, so ES counts half. Null when life or ES is unknown. */
  chaosRawPool: number | null

  armour: number
  /** Physical DR poe.ninja computed, against the hit size it assumed. */
  physicalDamageReduction: number | null
  /** The hit size that DR figure corresponds to, when stated. */
  physicalDamageReductionAgainstHit: number | null

  evasion: number
  /**
   * poe.ninja's evade chance, read as given. Null when the payload carries none:
   * never 0, which would read as "cannot evade". Not derived locally; see
   * `evadeChance()` in constants.ts for why that formula is not used.
   */
  evadeChance: number | null
  blockChance: number

  /** 0.5 mechanics V1 had no model for. */
  deflectionRating: number
  deflectChance: number
  deflectEffect: number

  spirit: number
  /** Stats the payload omitted entirely, so callers can say what's missing. */
  missing: string[]
}

/** A resistance whose value the payload reported. */
export type KnownResistance = ResistanceState & { value: number; overCap: number; underCap: number; capped: boolean }

export function isKnownResistance(r: ResistanceState): r is KnownResistance {
  return r.value !== null
}

/** Resistances with a reported value. Unknown ones are excluded, never counted as 0. */
export function knownResistances(d: Pick<DefenseSummary, 'resistances'>): KnownResistance[] {
  return d.resistances.filter(isKnownResistance)
}

/** Known resistances below their cap. An unknown resistance is not a shortfall. */
export function resistanceShortfalls(d: Pick<DefenseSummary, 'resistances'>): KnownResistance[] {
  return knownResistances(d).filter((r) => r.underCap > 0)
}

const MAX_HIT_KEYS: Record<DamageType, keyof NinjaDefensiveStats> = {
  physical: 'physicalMaximumHitTaken',
  fire: 'fireMaximumHitTaken',
  cold: 'coldMaximumHitTaken',
  lightning: 'lightningMaximumHitTaken',
  chaos: 'chaosMaximumHitTaken',
}

const RES_KEYS = {
  fire: ['fireResistance', 'fireResistanceMax', 'fireResistanceOverCap'],
  cold: ['coldResistance', 'coldResistanceMax', 'coldResistanceOverCap'],
  lightning: ['lightningResistance', 'lightningResistanceMax', 'lightningResistanceOverCap'],
  chaos: ['chaosResistance', 'chaosResistanceMax', 'chaosResistanceOverCap'],
} as const satisfies Record<string, readonly [keyof NinjaDefensiveStats, keyof NinjaDefensiveStats, keyof NinjaDefensiveStats]>

function num(stats: NinjaDefensiveStats, key: keyof NinjaDefensiveStats): number | null {
  const v = stats[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function analyzeDefense(model: Pick<CharModel, 'defensiveStats'>): DefenseSummary {
  const s = model.defensiveStats ?? {}
  const missing: string[] = []

  const maxHitValues = DAMAGE_TYPES.map((type) => ({ type, value: num(s, MAX_HIT_KEYS[type]) }))
  const known = maxHitValues.filter((m): m is { type: DamageType; value: number } => m.value !== null && m.value > 0)
  for (const m of maxHitValues) if (m.value === null) missing.push(MAX_HIT_KEYS[m.type])

  const highest = known.length ? Math.max(...known.map((m) => m.value)) : 0
  const lowestValue = known.length ? Math.min(...known.map((m) => m.value)) : null
  const lowestEntry = known.find((m) => m.value === lowestValue) ?? null

  const maxHits: MaxHit[] = known
    .map((m) => ({
      type: m.type,
      value: m.value,
      isLowest: m.value === lowestValue,
      ratioToHighest: highest > 0 ? highest / m.value : 1,
    }))
    .sort((a, b) => a.value - b.value)

  const resistances: ResistanceState[] = (Object.keys(RES_KEYS) as Array<keyof typeof RES_KEYS>).map((type) => {
    const [valueKey, maxKey, overKey] = RES_KEYS[type]
    const value = num(s, valueKey)
    const max = num(s, maxKey) ?? RES_CAP_DEFAULT
    if (value === null) missing.push(valueKey)
    return {
      type,
      value,
      max,
      overCap: value === null ? null : (num(s, overKey) ?? 0),
      underCap: value === null ? null : Math.max(0, max - value),
      capped: value === null ? null : value >= max,
    }
  })

  const life = num(s, 'life')
  const energyShield = num(s, 'energyShield')
  if (life === null) missing.push('life')
  if (energyShield === null) missing.push('energyShield')

  // poe.ninja reports lowestMaximumHitTaken directly; prefer it, but fall back
  // to the minimum we computed rather than reporting nothing.
  const reportedLowest = num(s, 'lowestMaximumHitTaken')
  const lowestMaximumHit = reportedLowest ?? lowestValue
  const ehp = num(s, 'effectiveHealthPool')

  const physReduction = s.damageReductions?.physical ?? null

  return {
    lowestMaximumHit,
    lowestMaximumHitType: lowestEntry?.type ?? null,
    effectiveHealthPool: ehp,
    ehpOverstatementRatio: ehp !== null && lowestMaximumHit ? ehp / lowestMaximumHit : null,

    maxHits,
    resistances,
    impliedResistances: impliedResistances({
      life,
      energyShield,
      physicalMaxHit: maxHits.find((m) => m.type === 'physical')?.value ?? null,
      maxHits: {
        fire: maxHits.find((m) => m.type === 'fire')?.value ?? null,
        cold: maxHits.find((m) => m.type === 'cold')?.value ?? null,
        lightning: maxHits.find((m) => m.type === 'lightning')?.value ?? null,
      },
      displayed: {
        fire: resistances.find((r) => r.type === 'fire')?.value ?? null,
        cold: resistances.find((r) => r.type === 'cold')?.value ?? null,
        lightning: resistances.find((r) => r.type === 'lightning')?.value ?? null,
      },
    }),

    life,
    energyShield,
    ward: num(s, 'ward'),
    chaosRawPool: life === null || energyShield === null ? null : chaosRawPool(life, energyShield),

    armour: num(s, 'armour') ?? 0,
    physicalDamageReduction: typeof physReduction?.value === 'number' ? physReduction.value : null,
    physicalDamageReductionAgainstHit:
      typeof physReduction?.takenDamage === 'number' ? physReduction.takenDamage : null,

    evasion: num(s, 'evasionRating') ?? 0,
    evadeChance: num(s, 'evadeChance'),
    blockChance: num(s, 'blockChance') ?? 0,

    deflectionRating: num(s, 'deflectionRating') ?? 0,
    deflectChance: num(s, 'deflectChance') ?? 0,
    deflectEffect: num(s, 'deflectEffect') ?? 0,

    spirit: num(s, 'spirit') ?? 0,
    missing,
  }
}

/**
 * Project physical DR at a different armour value, against the same hit size
 * poe.ninja used. Returns null when the hit size is unknown — guessing one
 * would make the projection meaningless.
 */
export function projectArmour(
  summary: DefenseSummary,
  newArmour: number,
): { from: number; to: number; againstHit: number } | null {
  const hit = summary.physicalDamageReductionAgainstHit
  if (hit === null || hit <= 0) return null
  return {
    from: armourDamageReduction(summary.armour, hit),
    to: armourDamageReduction(newArmour, hit),
    againstHit: hit,
  }
}

export * from './constants.js'
export * from './implied.js'
