/**
 * Type-only schema for D2: the table mapping this repo's internal stat ids to
 * the trade site's stat ids, and the recorded snapshot that verifies it.
 * DESIGN ONLY: no mapping data exists, nothing reads or writes it.
 *
 * Lives under pob/ only because this task's scope is limited to that folder;
 * it belongs next to `trade/query.ts` when built.
 *
 * No trade stat id is stated anywhere in this repo. Every id is `null` until
 * captured from a recorded stats response (see docs/pob-mutation-design.md,
 * section 3). Nothing here is fetched.
 */

import type { StatRequirement } from '../trade/query.js'

/** Trade-site stat category. ASSUMPTION: the labels follow the public trade API's stats listing. */
export type TradeStatCategory = 'explicit' | 'implicit' | 'enchant' | 'rune' | 'pseudo' | 'fractured' | 'crafted' | 'unknown'

export interface TradeStatEvidence {
  /** `TradeStatsSnapshot.snapshotId` the id and text were matched in. */
  snapshotId: string
  /** The trade site's own text for the stat, as recorded. */
  tradeText: string
}

export interface TradeStatMapEntry {
  /** Internal id, e.g. the key of `RESIST_STAT`'s values. Same as the record key. */
  internalId: string
  /** Null until captured. A null id is "unmapped", never a placeholder string. */
  tradeId: string | null
  category: TradeStatCategory
  /**
   * False by default. True only when `evidence` is present AND the schema test
   * found `tradeId` with the same text in the committed snapshot.
   */
  verified: boolean
  evidence: TradeStatEvidence | null
  /**
   * How a minimum in internal units becomes a trade minimum. Null = identity.
   * Needed only if the two sources disagree on units; not assumed to be needed.
   */
  valueTransform: { scale: number; offset: number } | null
  /**
   * Internal stats that the trade stat does not cover on its own. Example: a
   * hybrid affix granting two resistances is a different trade stat from either
   * single one, so a single-stat filter excludes it. Free text, shown to the user.
   */
  coverageNote: string | null
}

export interface TradeStatMapFile {
  schemaVersion: 1
  /** Game version the snapshot was taken against; null until captured. */
  gameVersion: string | null
  snapshotId: string | null
  entries: Readonly<Record<string, TradeStatMapEntry>>
}

/** What happens to an entry that is not both mapped and verified. */
export type UnverifiedPolicy = 'exclude' | 'include-flagged'

export type TradeStatExclusionReason = 'no-entry' | 'no-trade-id' | 'unverified'

export interface ResolvedTradeStatMap {
  /** Same shape `buildTradeQueries` already takes. */
  map: Readonly<Record<string, string>>
  excluded: readonly { statId: string; reason: TradeStatExclusionReason }[]
  /** Ids present in `map` although `verified` is false. Empty under 'exclude'. */
  includedUnverified: readonly string[]
}

/** Added to each variant by the builder (not present in `trade/query.ts` today). */
export interface TradeVariantCompleteness {
  /** True when every filter used came from a verified entry. */
  allVerified: boolean
  /**
   * False when a must-keep requirement was dropped as unmapped. Such a query can
   * return items that break a resistance cap, so it is not offered as a safe search.
   */
  mustKeepComplete: boolean
  droppedMustKeep: readonly StatRequirement[]
}

// --- Recorded snapshot and test inputs --------------------------------------

/** A trimmed, committed copy of the trade site's stats listing. Recorded by hand, outside CI. */
export interface TradeStatsSnapshot {
  snapshotId: string
  /** ISO timestamp the owner recorded it. */
  capturedAt: string
  sourceUrl: string
  gameVersion: string | null
  /** Only the entries the map needs, in source order. */
  entries: readonly { id: string; text: string; type: string }[]
}

export interface TradeQuerySnapshotCase {
  name: string
  target: { baseType?: string; mustKeep: readonly StatRequirement[]; wanted: readonly StatRequirement[] }
  policy: UnverifiedPolicy
  /** Path of the committed expected-JSON file for all three variants. */
  expectedFile: string
}
