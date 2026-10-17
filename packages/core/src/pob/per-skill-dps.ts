/**
 * Type-only design for A8: PoB DPS for every skill, to sit beside poe.ninja's
 * per-skill figures. DESIGN ONLY: nothing implements these.
 *
 * A PoB export carries one `TotalDPS` (for the selected skill); `FullDPS` is
 * 0 in the recorded export because no group sets `includeInFullDPS`. Per-skill
 * figures therefore come from switching the selection and reading `TotalDPS`.
 * The RPC that switches it (`apply_step{op:'set_main_selection'}`) is an
 * ASSUMPTION, as are `get_config_input` / `set_config_input`.
 *
 * See docs/pob-mutation-design.md, section 4.
 */

import type { BaselineExpectation } from './baseline-gate.js'
import type { MainSelectionReadback, ProbeBudget, ProbeResult } from './mutation.js'

/** One selectable skill: a group, one of its enabled active gems, and a part. */
export interface SkillSelection {
  /** 1-based `<Skill>` group in the active SkillSet. */
  group: number
  /** 1-based among the group's enabled active gems. */
  activeIndex: number
  /** Null = PoB's default part; the part is never guessed. */
  skillPart: number | null
  name: string
}

export type PerSkillMode =
  /** Switch the selection, recalculate, read `TotalDPS`, restore. The default. */
  | 'select-iterate'
  /** One `get_full_dps` call. Usable only when the groups carry `includeInFullDPS`. Cross-check only. */
  | 'full-dps-rpc'

export interface PerSkillDpsRequest {
  mode: PerSkillMode
  /**
   * Which skills to read. 'ninja-listed' limits the run to skills poe.ninja
   * also lists (the ones that can be compared), which is the cheap default.
   */
  skills: 'ninja-listed' | 'all-enabled' | readonly SkillSelection[]
  /** Gates the baseline. Must include the export's main skill `TotalDPS`. */
  expected: readonly BaselineExpectation[]
  budget?: ProbeBudget
}

export type PerSkillReadingStatus =
  | 'measured'
  /** Selected, calculated, no hit or DoT output (an aura or buff). Not zero DPS. */
  | 'no-damage-output'
  /** Tied to the inactive weapon set, or granted by an item not in the active set. */
  | 'needs-weapon-set-swap'
  /** The selection did not take, or the baseline skill did not reproduce. */
  | 'selection-readback-mismatch'
  | 'unmeasured'

export interface PerSkillReading {
  selection: SkillSelection
  status: PerSkillReadingStatus
  /** PoB `TotalDPS` for this selection. Null unless `measured`. */
  hitDps: number | null
  /** PoB `TotalDotDPS`. */
  dotDps: number | null
  /** What PoB reported as selected afterwards. */
  readback: MainSelectionReadback | null
  /** True for the reading that reproduces the export's own `TotalDPS`. */
  isExportMain: boolean
  /** Number of parts PoB offers for the skill, when it says; null when it does not. */
  partCount: number | null
  reason: string | null
}

/** Result of pairing one PoB skill with poe.ninja's. */
export type PerSkillComparisonStatus =
  /** Within the gate tolerance (1 % or 1 unit). */
  | 'agrees'
  /** Above the gate tolerance, at most 5 %. */
  | 'minor'
  /** Above 5 %. Shown, with both figures, as a difference to explain. */
  | 'diverges'
  | 'not-in-ninja'
  | 'not-in-pob'
  /** Repeated name on either side, an unnamed poe.ninja entry, or parts that cannot be paired. */
  | 'ambiguous'
  | 'not-compared'

export interface PerSkillComparison {
  skill: string
  basis: 'hit' | 'dot'
  pob: number | null
  ninja: number | null
  /** (pob - ninja) / ninja, null when either is missing or ninja is 0. */
  relativeDifference: number | null
  status: PerSkillComparisonStatus
  note: string | null
}

export interface PerSkillDpsReport {
  readings: readonly PerSkillReading[]
  comparisons: readonly PerSkillComparison[]
  /** PoB's own FullDPS when the RPC mode ran; 0 or null is reported as such, never inferred. */
  fullDps: { reported: number | null; groupsIncluded: number | null } | null
  /** True when the budget stopped the run before every requested skill. */
  partial: boolean
}

export interface PerSkillDpsProbe {
  measurePerSkillDps(request: PerSkillDpsRequest): Promise<ProbeResult<PerSkillDpsReport>>
}

// ---------------------------------------------------------------------------
// Config readback (X4, B1). Names and RPCs unverified.
// ---------------------------------------------------------------------------

/**
 * One configuration input. 'default' means PoB reports it unset (the export
 * omits unset inputs); 'unreadable' means the RPC did not answer for it. The
 * three states are never merged: an unreadable input is not a default.
 */
export type ConfigValue =
  | { state: 'set'; value: boolean | number | string }
  | { state: 'default' }
  | { state: 'unreadable'; reason: string }

/**
 * Input names read from the recorded export's `<Input name=…>` list. Exports
 * list only inputs that are set. `buffMode` is stored as `misc_buffMode`.
 */
export type ExportedConfigInputName =
  | 'misc_buffMode'
  | 'skill_number'
  | 'conditionEnemyChilled'
  | 'conditionEnemyIgnited'
  | 'conditionEnemyBleeding'
  | 'conditionBeenHitRecently'
  | 'conditionCritRecently'
  | 'conditionMoving'
  | 'multiplierNearbyEnemies'
  | 'multiplierNearbyRareOrUniqueEnemies'
  | 'DisableEHPGainOnBlock'

export interface ConfigComparison {
  name: string
  exported: ConfigValue
  live: ConfigValue
  /** True only when both are 'set' with equal values, or both 'default'. Unreadable is never equal. */
  equal: boolean
}

export interface ConfigReadbackResult {
  values: Readonly<Record<string, ConfigValue>>
  /** Per input, live PoB against the export's `<Input>` elements. */
  comparison: readonly ConfigComparison[]
}
