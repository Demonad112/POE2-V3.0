/**
 * Type-only design for A3: measuring what a support gem is worth by disabling
 * it. DESIGN ONLY: nothing implements these.
 *
 * The mutated field is `enabled` on one `<Gem>` of one `<Skill>` group (both
 * attributes exist in recorded exports; see main-skill.ts and skill-groups.ts).
 * The RPC that edits it (`apply_step{op:'set_gem_field'}`) is an ASSUMPTION.
 *
 * See docs/pob-mutation-design.md, section 2.
 */

import type { BaselineExpectation } from './baseline-gate.js'
import type { MainSelectionReadback, ProbeBudget, ProbeResult } from './mutation.js'

/** One socketed gem, addressed so an index shift cannot edit the wrong one. */
export interface GemRef {
  /** 1-based `<Skill>` group within the active SkillSet. */
  group: number
  /** 1-based `<Gem>` position within the group, counting disabled gems. */
  gem: number
  /** `nameSpec`. The edit fails with `gem-mismatch` if the gem at `gem` differs. */
  name: string
}

/**
 * Cost stats read alongside TotalDPS (the request reads all of them) so a support whose value is cost, not damage,
 * is not reported as worthless. Keys exist in the recorded export's PlayerStat
 * list; that `get_calcs` returns the same keys is an ASSUMPTION.
 */
export type SupportCostStat =
  | 'ManaCost'
  | 'ManaPerSecondCost'
  | 'LifeCost'
  | 'ESCost'
  | 'SoulCost'
  | 'Spirit'
  | 'SpiritUnreserved'
  | 'Speed'

/** How far interaction measurement goes. */
export type InteractionScope =
  /** Leave-one-out only. Interactions are not measured and the report says so. */
  | 'none'
  /** Every pair, when the group has at most `pairLimit` supports. */
  | 'all-pairs'
  /** Pairs among the `topN` supports by marginal delta. */
  | { top: number }

export interface SupportRemovalRequest {
  /** 1-based group. Must be the group the export marks as main for the first version. */
  group: number
  /** Supports to remove one at a time. 'all' = every enabled support in the group. */
  supports: readonly GemRef[] | 'all'
  interactions: InteractionScope
  /** Stat compared for the headline delta. Must be one of `expected`'s keys. */
  metric: 'TotalDPS'
  expected: readonly BaselineExpectation[]
  budget?: ProbeBudget
}

export type SupportRemovalOutcome =
  /** The skill stayed the same and a gated stat moved. */
  | 'measured'
  /** Applied, readback matches, no stat moved beyond the gate tolerance. Not "zero value". */
  | 'no-measurable-effect'
  /** The removal changed which skill TotalDPS describes. No delta is reported. */
  | 'main-skill-changed'
  /** TotalDPS went to 0 or the skill stopped being usable: the support is required, not "valuable". */
  | 'breaks-skill'
  /** Not attempted or failed; `reason` says why (budget, gem-mismatch, rpc-unsupported). */
  | 'unmeasured'

export interface SupportCostChange {
  stat: SupportCostStat
  before: number | null
  after: number | null
}

export interface SupportRemovalEntry {
  gem: GemRef
  outcome: SupportRemovalOutcome
  /** Null unless `outcome` is 'measured'. */
  metric: { before: number; after: number } | null
  /**
   * Cost-side changes, reported separately and never folded into the DPS
   * figure. A minus-cost support shows here, with `metric` near zero.
   */
  cost: readonly SupportCostChange[]
  /** True when DPS barely moved but a cost stat did: its value is efficiency. */
  costOnly: boolean
  /** Selection before and after, so a changed selection can be shown. */
  mainBefore: MainSelectionReadback
  mainAfter: MainSelectionReadback | null
  reason: string | null
}

/** Removing two supports together versus the sum of removing each alone. */
export interface SupportInteraction {
  a: GemRef
  b: GemRef
  /** TotalDPS with both disabled. Null when either was not measurable. */
  bothRemoved: number | null
  /**
   * ln(both/base) - ln(a/base) - ln(b/base). Zero means independent. Null when
   * a term is missing.
   */
  synergy: number | null
  /** True when |synergy| exceeds the interaction threshold (owner decision, section 5). */
  flagged: boolean
}

export interface SupportRemovalReport {
  group: number
  /** The skill the group's TotalDPS describes at baseline. */
  mainSkill: MainSelectionReadback
  metric: 'TotalDPS'
  baselineValue: number
  entries: readonly SupportRemovalEntry[]
  interactions: readonly SupportInteraction[]
  interactionCoverage: 'none' | 'partial' | 'complete'
  /** True when the budget stopped the run before every requested removal. */
  partial: boolean
}

export interface SupportRemovalProbe {
  measureRemovals(request: SupportRemovalRequest): Promise<ProbeResult<SupportRemovalReport>>
}

// ---------------------------------------------------------------------------
// How the analyzer would consume a report (labels only; no logic here)
// ---------------------------------------------------------------------------

export type SupportValueLabel = 'pob-sim' | 'nominal' | 'unknown'

/** Why an injected report was not used. Each maps to the existing "nominal, not measured" text. */
export type SupportMeasurementRejection =
  | 'no-report'
  | 'status-not-measured'
  | 'baseline-gate-failed'
  | 'not-reverted'
  | 'build-differs-from-analysed'
  | 'group-not-the-analysed-main-group'
  | 'gem-not-in-report'
  | 'entry-unmeasured'
  | 'main-skill-changed'
  | 'partial-report'

/** What `reviewDamage` would accept as an optional input. Not wired anywhere. */
export interface SupportMeasurementInput {
  report: ProbeResult<SupportRemovalReport>
}
