/**
 * Type-only contract for PoB mutation RPCs and the probes built on them
 * (C1-C5). DESIGN ONLY: nothing implements these, nothing here runs.
 *
 * Every RPC name, parameter and result field in `PobMutationRpc` is an
 * ASSUMPTION. The addon source has not been read for them from this repo; the
 * only RPCs verified in `bridge.ts` are `load_build_direct`, `recalculate`,
 * `get_calcs`, `get_full_dps`, `set_passive_node`, `get_passive_tree`,
 * `reset_tree`, `get_custom_mods`, `set_custom_mods` and `get_stat_breakdown`
 * (`get_config_input` / `set_config_input` are used by `bridgeProbe` in
 * sensitivity.ts and are also unverified).
 *
 * See docs/pob-mutation-design.md, section 1.
 */

import type { LedgerStat } from '../constraints/ledger.js'
import type { BaselineExpectation, BaselineGateResult } from './baseline-gate.js'
import type { MeasuredDelta } from './probes.js'

// ---------------------------------------------------------------------------
// State primitives (ASSUMPTION: none exist in the addon today)
// ---------------------------------------------------------------------------

export type StateScope = 'items' | 'skills' | 'tree' | 'config' | 'custom-mods'

/**
 * Hash of each scope's canonical serialisation, computed inside the addon so a
 * revert can be proven by equality rather than by "the undo call returned".
 */
export type StateFingerprint = Readonly<Record<StateScope, string>>

export interface ItemSocketReadback {
  /** Total sockets PoB believes the item has. Null when PoB does not say. */
  count: number | null
  /** Socketable per socket (rune / soul core name), null for an empty socket. */
  filled: readonly (string | null)[]
}

export interface ItemSlotReadback {
  /** PoB slot name, e.g. "Weapon 1", "Weapon 1 Swap", "Ring 1", "Amulet". */
  slot: string
  /** Null when the slot is empty. */
  text: string | null
  sockets: ItemSocketReadback | null
  /** True when the slot belongs to the weapon set PoB has active. */
  inActiveWeaponSet: boolean
}

export interface GemReadback {
  index: number
  nameSpec: string
  skillId: string | null
  enabled: boolean
  level: number | null
  quality: number | null
  /** PoB's effective level after item bonuses, when it reports one. */
  effectiveLevel: number | null
}

export interface SkillGroupReadback {
  /** 1-based, within the active SkillSet (the same indexing as `readPobSkillGroups`). */
  index: number
  enabled: boolean
  includeInFullDps: boolean | null
  gems: readonly GemReadback[]
}

/** What PoB currently computes TotalDPS for. Compared before and after every mutation. */
export interface MainSelectionReadback {
  group: number | null
  /** 1-based among the group's enabled active gems; null = PoB default (first). */
  activeIndex: number | null
  skillPart: number | null
  /** The skill name PoB reports, when it reports one. */
  skillName: string | null
}

/** One reversible edit. The unit that `batch_measure` accepts. */
export type MutationStep =
  | { op: 'set_item'; slot: string; text: string | null }
  | { op: 'set_gem_field'; group: number; gem: number; expectName: string; field: 'enabled' | 'level' | 'quality'; value: boolean | number }
  | { op: 'set_main_selection'; group: number; activeIndex: number | null; skillPart: number | null }
  | { op: 'set_config_input'; name: string; value: boolean | number | string | null }
  | { op: 'tree'; add: readonly number[]; remove: readonly number[] }

export interface TreeEffect {
  /** Everything that became allocated, including auto-pathed nodes. */
  added: readonly number[]
  /** Everything that stopped being allocated, including orphaned dependents. */
  removed: readonly number[]
}

export interface MutationOutcome {
  /** Numeric stats requested, from PoB's own calculation. */
  stats: Readonly<Record<string, number>>
  main: MainSelectionReadback
  /** What PoB holds after the edit, so the caller can compare it with what was asked. */
  items: readonly ItemSlotReadback[]
  skills: readonly SkillGroupReadback[]
  treeEffect: TreeEffect | null
  parseWarnings: readonly string[]
}

/**
 * RPC surface the transport lacks. ASSUMPTION throughout: method names,
 * params and results are proposals to be checked against the addon source.
 */
export interface PobMutationRpc {
  snapshot_state: { params: { scope: readonly StateScope[] }; result: { token: string; fingerprint: StateFingerprint } }
  restore_state: { params: { token: string }; result: { fingerprint: StateFingerprint } }
  state_fingerprint: { params: { scope: readonly StateScope[] }; result: { fingerprint: StateFingerprint } }
  get_items: {
    params: Record<string, never>
    result: { activeItemSet: string | null; activeWeaponSet: 1 | 2 | null; slots: readonly ItemSlotReadback[] }
  }
  get_skill_groups: {
    params: Record<string, never>
    result: { groups: readonly SkillGroupReadback[]; main: MainSelectionReadback }
  }
  /**
   * Non-mutating what-if (PoB's own calculator takes an override table in its
   * item-comparison code; whether the addon can reach it is unverified). When
   * available it replaces mutate-measure-revert for items and nodes: nothing
   * is changed, so nothing needs reverting.
   */
  calc_with_override: {
    params: {
      items?: readonly { slot: string; text: string | null }[]
      tree?: { add: readonly number[]; remove: readonly number[] }
      stats: readonly string[]
    }
    result: MutationOutcome
  }
  /** Apply one edit and recalculate. Mutating: needs a snapshot taken first. */
  apply_step: { params: { step: MutationStep; stats: readonly string[] }; result: MutationOutcome }
  /**
   * Apply each item's steps to the same base state, read stats, restore the
   * base state inside the addon, repeat. One connection, one fingerprint check
   * at the end. Items are independent of each other.
   */
  batch_measure: {
    params: { token: string; items: readonly { id: string; steps: readonly MutationStep[] }[]; stats: readonly string[] }
    result: {
      results: readonly ({ id: string; ok: true; outcome: MutationOutcome } | { id: string; ok: false; code: MutationFailureCode; message: string })[]
      fingerprintAfter: StateFingerprint
    }
  }
}

export type PobMutationMethod = keyof PobMutationRpc

// ---------------------------------------------------------------------------
// Failure modes
// ---------------------------------------------------------------------------

export type MutationFailureCode =
  | 'rpc-unsupported' // the addon does not know the method (the expected state until built)
  | 'invalid-item-text' // PoB could not parse the item, or parsed it with no base/mods
  | 'readback-mismatch' // PoB holds something other than what was asked
  | 'slot-conflict' // e.g. a two-hander into Weapon 1 while Weapon 2 is occupied
  | 'wrong-weapon-set' // the edit targets the inactive weapon set; its effect is not in TotalDPS
  | 'socket-count' // more socketables than sockets, or a socket index out of range
  | 'unknown-socketable' // rune / soul core name not recognised by PoB
  | 'gem-mismatch' // group/gem index does not carry the expected gem name
  | 'value-out-of-range' // level or quality outside what PoB accepts
  | 'node-not-found'
  | 'main-skill-changed' // the mutation moved the skill TotalDPS belongs to
  | 'revert-failed' // fingerprint after restore differs from before
  | 'baseline-failed' // checkBaseline did not pass; deltas withheld
  | 'budget-exhausted'
  | 'timeout'
  | 'aborted'

export interface MutationFailure {
  code: MutationFailureCode
  message: string
  slot?: string
}

// ---------------------------------------------------------------------------
// Result envelope shared by every probe
// ---------------------------------------------------------------------------

/** Ceiling on a probe run. Exhaustion returns what was measured, flagged partial. */
export interface ProbeBudget {
  maxRpcCalls: number
  maxWallMs: number | null
}

export interface ProbeMeta {
  source: 'pob-sim'
  /** State the baseline and the deltas were taken from. Must equal the analysed build's. */
  fingerprintBefore: StateFingerprint
  /** Null when the restore was not reached. */
  fingerprintAfter: StateFingerprint | null
  /** True only when `fingerprintAfter` equals `fingerprintBefore`. */
  reverted: boolean
  baselineGate: BaselineGateResult
  rpcCalls: number
  elapsedMs: number | null
  /** Names the RPC path used. 'override' mutates nothing. */
  mode: 'override' | 'mutate-revert'
  warnings: readonly string[]
}

/**
 * Every probe returns one of these. `measured` is the only status that carries
 * a number. `unmeasurable` means the change applied and no stat moved: it is
 * not zero value. `withheld` means a gate refused to show the delta.
 */
export type ProbeResult<D> =
  | (ProbeMeta & { status: 'measured'; delta: D })
  | (ProbeMeta & { status: 'unmeasurable'; delta: null; reason: string })
  | (ProbeMeta & { status: 'withheld'; delta: null; reason: string })
  | { status: 'failed'; delta: null; source: 'pob-sim'; failure: MutationFailure; rpcCalls: number; reverted: boolean | null }

// ---------------------------------------------------------------------------
// C1 / C3 / C5: item changes
// ---------------------------------------------------------------------------

export interface SocketableRef {
  name: string
  family: 'rune' | 'soul-core' | 'unknown'
}

export type ItemChange =
  /** Add or swap one affix line. `remove` null adds into a free affix slot. */
  | { kind: 'replace-mod'; remove: string | null; add: string }
  | { kind: 'set-gem-quality'; group: number; gem: number; gemName: string; quality: number }
  | { kind: 'set-gem-level'; group: number; gem: number; gemName: string; level: number }
  | { kind: 'swap-socketable'; socket: number; socketable: SocketableRef | null }
  | { kind: 'set-anoint'; notableNodeId: number; notableName: string }
  | { kind: 'swap-unique'; unique: UniqueSwap }

/** A unique item to try in a slot. Rolls are explicit; the probe never assumes a roll. */
export interface UniqueSwap {
  name: string
  baseType: string
  /** Complete PoB item text with every roll fixed. */
  itemText: string
  rolls: 'min' | 'max' | 'explicit'
  /** Roll ranges per line when the dataset states them; null when it does not. */
  rollRanges: readonly { line: string; min: number; max: number }[] | null
  /** Where the item text came from. Required so a stale dataset is visible. */
  dataset: { source: string; version: string }
}

export interface SlotEdit {
  slot: string
  change: ItemChange
}

/**
 * One atomic item change. Several edits move together so a two-hander and the
 * emptied off-hand are one measurement, never two.
 */
export interface ItemChangeRequest {
  edits: readonly SlotEdit[]
  /** Slots this change empties. Never implied: a 2H into Weapon 1 lists "Weapon 2" here. */
  clears: readonly string[]
  /** 'active' = whichever set PoB has active. A change to the other set is `wrong-weapon-set`. */
  weaponSet: 1 | 2 | 'active'
  expected: readonly BaselineExpectation[]
  /** Stats to read in addition to the ones in `expected` (e.g. Spirit, attributes for the ledger). */
  extraStats?: readonly string[]
  budget?: ProbeBudget
}

/** `MeasuredDelta` plus the ledger inputs C5 needs. Unreported stats are absent, not 0. */
export interface ItemMeasurement extends MeasuredDelta {
  /** Before/after of every `LedgerStat` PoB reported, for `applyLedger`. */
  ledger: Partial<Record<LedgerStat, { before: number; after: number }>>
  /** Slots whose content differs from before, including any in `clears`. */
  changedSlots: readonly string[]
}

/** A unique with roll ranges reports both ends. Never a single "expected" value. */
export interface RangedItemMeasurement {
  atMinRolls: ItemMeasurement
  atMaxRolls: ItemMeasurement
}

// ---------------------------------------------------------------------------
// C2: anoint
// ---------------------------------------------------------------------------

export interface AnointRequest {
  amuletSlot: string
  notableNodeId: number
  notableName: string
  expected: readonly BaselineExpectation[]
  budget?: ProbeBudget
}

export interface AnointMeasurement extends ItemMeasurement {
  /** Passive points the anoint costs. Expected 0; read from the tree diff, not assumed. */
  pointsCost: number | null
}

export interface AnointBatchRequest {
  amuletSlot: string
  candidates: readonly { notableNodeId: number; notableName: string }[]
  expected: readonly BaselineExpectation[]
  budget: ProbeBudget
}

export interface AnointRankEntry {
  notableNodeId: number
  notableName: string
  result: ProbeResult<AnointMeasurement>
}

export interface AnointRanking {
  source: 'pob-sim'
  /** Measured entries, best first by the upgrade score for the chosen mode. */
  ranked: readonly AnointRankEntry[]
  /** Candidates not measured, each with a reason. Never ranked. */
  unmeasured: readonly { notableNodeId: number; notableName: string; reason: string }[]
  /** True when the budget ended the run before every candidate was tried. */
  partial: boolean
  /** Cost is a separate concern. Without a price source this is always 'unpriced'. */
  cost: 'unpriced'
}

// ---------------------------------------------------------------------------
// C4: respec
// ---------------------------------------------------------------------------

/** One reallocation to measure: refund `remove`, spend on `add`. */
export interface RespecPlan {
  remove: readonly number[]
  add: readonly number[]
}

export interface RespecRequest {
  plan: RespecPlan
  /** Points the plan may spend beyond what it refunds (unspent points). */
  freePoints: number
  /** Hard ceiling on net points spent. The plan is refused, not trimmed, if it exceeds this. */
  maxNetPoints: number
  expected: readonly BaselineExpectation[]
  budget?: ProbeBudget
}

export interface RespecMeasurement extends ItemMeasurement {
  /** Counts include orphaned and auto-pathed nodes, from the tree diff. */
  pointsRefunded: number
  pointsSpent: number
  netPoints: number
  /** Nodes removed because they depended on a removed node. */
  orphaned: readonly number[]
  /** Nodes added only to reach an added node. */
  autoPathed: readonly number[]
  /**
   * Removals that moved no stat when taken alone. A plan containing one is
   * `unmeasurable`: its refund is not shown as free.
   */
  unmeasurableRemovals: readonly { nodeId: number; reason: string }[]
  /** No gold data exists in the repo. */
  goldCost: 'unknown'
}
