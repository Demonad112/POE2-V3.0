/**
 * Interfaces for simulations that need a PoB worker. NOTHING IMPLEMENTS THESE.
 *
 * They exist so the analyzer can accept a measurement when one is injected and
 * stay `nominal`/`unknown` when not. See docs/pob-worker-design.md ("Measured
 * recommendations") for what each needs from the addon. Every result is
 * `source: 'pob-sim'` and must pass `checkBaseline` first.
 */

import type { BaselineExpectation } from './baseline-gate.js'

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

/** Remove one socketed support and report the DPS change (A3). */
export interface SupportRemovalProbe {
  measureRemoval(skill: string, support: string, expected: readonly BaselineExpectation[]): Promise<MeasuredResult>
}

/** Replace or modify an equipped item or gem and report the change (C1, C3, C5). */
export interface ItemChangeProbe {
  measureItemChange(
    slot: string,
    change: { kind: 'replace-mod' | 'set-gem-quality' | 'set-gem-level' | 'swap-rune' | 'swap-unique'; detail: string },
    expected: readonly BaselineExpectation[],
  ): Promise<MeasuredResult>
}

/** Try an anoint (C2). */
export interface AnointProbe {
  measureAnoint(notableNodeId: number, expected: readonly BaselineExpectation[]): Promise<MeasuredResult>
}

/** Read the export's own configuration back from the live PoB (X4, B1). Names unverified. */
export interface ConfigReadback {
  readConfig(names: readonly string[]): Promise<Record<string, unknown>>
}
