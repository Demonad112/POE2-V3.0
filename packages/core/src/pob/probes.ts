/**
 * Interfaces for simulations that need a PoB worker. NOTHING IMPLEMENTS THESE.
 *
 * They exist so the analyzer can accept a measurement when one is injected and
 * stay `nominal`/`unknown` when not. See docs/pob-worker-design.md ("Measured
 * recommendations") for what each needs from the addon. Every result is
 * `source: 'pob-sim'` and must pass `checkBaseline` first.
 */

import type { BaselineExpectation } from './baseline-gate.js'
import type {
  AnointBatchRequest,
  AnointMeasurement,
  AnointRanking,
  AnointRequest,
  ItemChangeRequest,
  ItemMeasurement,
  ProbeResult,
  RangedItemMeasurement,
  RespecMeasurement,
  RespecRequest,
} from './mutation.js'

/** A change to try, reverted after measuring. */
export interface MeasuredDelta {
  /** Metric before and after, from the same engine. */
  before: number
  after: number
  /** Survivability components, so DPS and defence gains reconcile separately. */
  lowestMaxHit: { before: number; after: number } | null
  ehp: { before: number; after: number } | null
}

export interface MeasuredResult {
  source: 'pob-sim'
  delta: MeasuredDelta
  /** Set when the baseline did not reproduce poe.ninja, in which case `delta` must not be shown. */
  baselineFailed: string | null
}

/**
 * Disable each socketed support in a group in turn and report the change (A3).
 * Design: docs/pob-mutation-design.md, section 2.
 */
export type { SupportRemovalProbe } from './support-removal.js'

/**
 * Replace or modify an equipped item or gem and report the change (C1, C3, C5).
 * Request shape, failure codes and RPC mapping: docs/pob-mutation-design.md, section 1.
 */
export interface ItemChangeProbe {
  measureItemChange(request: ItemChangeRequest): Promise<ProbeResult<ItemMeasurement | RangedItemMeasurement>>
}

/** Try an anoint (C2): one candidate, or a ranked batch under a budget. */
export interface AnointProbe {
  measureAnoint(request: AnointRequest): Promise<ProbeResult<AnointMeasurement>>
  measureAnoints(request: AnointBatchRequest): Promise<AnointRanking>
}

/** Reallocate passive points under a budget and report the change (C4). */
export interface RespecProbe {
  measureRespec(request: RespecRequest): Promise<ProbeResult<RespecMeasurement>>
}

/** Read the export's own configuration back from the live PoB (X4, B1). Names unverified. */
export interface ConfigReadback {
  readConfig(names: readonly string[]): Promise<Record<string, unknown>>
}
