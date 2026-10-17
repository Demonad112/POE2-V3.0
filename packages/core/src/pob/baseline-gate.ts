/**
 * Baseline reproduction gate.
 *
 * A simulated delta is a difference between two numbers from the same engine,
 * so it is only as trustworthy as that engine's agreement with the character.
 * If the simulation's own baseline does not reproduce what poe.ninja observed
 * (a different resistance penalty, enemy conditions, a stale build), every
 * delta measured from it is wrong in a way that looks perfectly ordinary.
 *
 * So before any simulated delta is shown, the baseline the simulation starts
 * from is compared with poe.ninja's observed values. On any failure the caller
 * shows no deltas and names the stat that failed.
 *
 * Scope: this compares stats. It cannot prove the export's own PoB
 * configuration (resistance penalty, enemy conditions) is in force in the
 * live instance; reading it back needs RPCs not verified here. A passing gate
 * therefore means "the baseline reproduces the observed numbers", which is the
 * property that matters, and a failing one is the symptom of a config mismatch.
 * It never edits the export's configuration.
 */

import type { NinjaDefensiveStats } from '../model/types.js'

export interface BaselineTolerance {
  /** Allowed relative difference, as a fraction of the observed value. */
  relative: number
  /** Allowed absolute difference. Covers integer rounding on small values. */
  absolute: number
}

/** 1 % or 1 unit, whichever is larger. Flicker Strike 55,512 vs 55,513 passes. */
export const DEFAULT_BASELINE_TOLERANCE: BaselineTolerance = { relative: 0.01, absolute: 1 }

export interface BaselineExpectation {
  /** Short name used in messages, e.g. "Fire resistance (uncapped)". */
  label: string
  /** poe.ninja's observed value. */
  expected: number
  /**
   * Keys of the simulation's stat table. Their values are summed, so an
   * uncapped resistance is `['FireResist', 'FireResistOverCap']`.
   */
  simulatedKeys: readonly string[]
  tolerance?: BaselineTolerance
}

export interface BaselineCheck {
  label: string
  expected: number
  /** Null when the simulation did not report every key. */
  simulated: number | null
  difference: number | null
  ok: boolean
  reason: string | null
}

export interface BaselineGateResult {
  /** True only when every expectation reproduced. Zero expectations is not a pass. */
  ok: boolean
  checks: BaselineCheck[]
  failing: BaselineCheck[]
  /** One sentence naming the first failing stat, or why nothing could be checked. */
  reason: string | null
}

function read(stats: Readonly<Record<string, unknown>>, keys: readonly string[]): number | null {
  let total = 0
  for (const key of keys) {
    const v = stats[key]
    if (typeof v !== 'number' || !Number.isFinite(v)) return null
    total += v
  }
  return total
}

export function checkBaseline(
  expectations: readonly BaselineExpectation[],
  simulated: Readonly<Record<string, unknown>>,
  defaults: BaselineTolerance = DEFAULT_BASELINE_TOLERANCE,
): BaselineGateResult {
  if (expectations.length === 0) {
    return {
      ok: false,
      checks: [],
      failing: [],
      reason: 'No observed values were available to check the simulation baseline against.',
    }
  }

  const checks: BaselineCheck[] = expectations.map((e) => {
    const value = read(simulated, e.simulatedKeys)
    if (value === null) {
      return {
        label: e.label,
        expected: e.expected,
        simulated: null,
        difference: null,
        ok: false,
        reason: `Path of Building did not report ${e.simulatedKeys.join(' + ')}.`,
      }
    }
    const tol = e.tolerance ?? defaults
    const difference = value - e.expected
    const allowed = Math.max(tol.absolute, Math.abs(e.expected) * tol.relative)
    const ok = Math.abs(difference) <= allowed
    return {
      label: e.label,
      expected: e.expected,
      simulated: value,
      difference,
      ok,
      reason: ok ? null : `${e.label}: poe.ninja observed ${e.expected}, the simulation's baseline is ${value}.`,
    }
  })

  const failing = checks.filter((c) => !c.ok)
  return {
    ok: failing.length === 0,
    checks,
    failing,
    reason: failing.length
      ? `Simulation baseline does not reproduce poe.ninja (${failing.map((f) => f.label).join(', ')}). ` +
        `${failing[0]!.reason} Simulated deltas are withheld: check the build and its Path of Building configuration ` +
        '(resistance penalty, enemy conditions) match the character.'
      : null,
  }
}

const RESIST_TYPES = ['fire', 'cold', 'lightning', 'chaos'] as const
const MAX_HIT_TYPES = ['physical', 'fire', 'cold', 'lightning'] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Expectations built from what poe.ninja observed. Values poe.ninja did not
 * report are omitted, never defaulted: an unknown cannot be reproduced.
 * Chaos max hit is included via the same key pattern.
 */
export function ninjaBaselineExpectations(
  stats: NinjaDefensiveStats | undefined,
  mainSkillDps?: number | null,
): BaselineExpectation[] {
  const s = stats ?? {}
  const out: BaselineExpectation[] = []
  const add = (label: string, expected: unknown, simulatedKeys: string[]) => {
    if (typeof expected === 'number' && Number.isFinite(expected)) out.push({ label, expected, simulatedKeys })
  }

  add('Life', s.life, ['Life'])
  add('Energy shield', s.energyShield, ['EnergyShield'])
  add('Evasion', s.evasionRating, ['Evasion'])

  for (const type of RESIST_TYPES) {
    const value = s[`${type}Resistance` as keyof NinjaDefensiveStats]
    const over = s[`${type}ResistanceOverCap` as keyof NinjaDefensiveStats]
    if (typeof value === 'number' && typeof over === 'number') {
      add(`${cap(type)} resistance (uncapped)`, value + over, [`${cap(type)}Resist`, `${cap(type)}ResistOverCap`])
    }
  }
  for (const type of [...MAX_HIT_TYPES, 'chaos'] as const) {
    add(`${cap(type)} maximum hit`, s[`${type}MaximumHitTaken` as keyof NinjaDefensiveStats], [`${cap(type)}MaximumHitTaken`])
  }
  if (mainSkillDps != null) add('Main skill DPS', mainSkillDps, ['TotalDPS'])
  return out
}
