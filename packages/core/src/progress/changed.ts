import { latestDiff, type CharacterSnapshot, type MetricDelta, type ResistanceMaxima } from './index.js'

/**
 * "Changed since last report": a short summary of the move between the two most
 * recent stored snapshots of one character, built on the existing `diffSnapshots`.
 *
 * With fewer than two snapshots there is no baseline, so the result says
 * `available: false` instead of presenting a single point as a trend.
 */
export interface ChangedSinceLastReport {
  available: boolean
  /** ISO time of the earlier and later snapshot; null when unavailable. */
  since: string | null
  until: string | null
  improved: MetricDelta[]
  worsened: MetricDelta[]
  newlyCapped: string[]
  newlyUncapped: string[]
  /** True when both snapshots exist and no tracked figure moved. */
  unchanged: boolean
}

const NONE: ChangedSinceLastReport = Object.freeze({
  available: false,
  since: null,
  until: null,
  improved: [],
  worsened: [],
  newlyCapped: [],
  newlyUncapped: [],
  unchanged: false,
})

export function changedSinceLastReport(
  history: CharacterSnapshot[],
  key: string,
  resistanceMax?: ResistanceMaxima,
): ChangedSinceLastReport {
  const diff = latestDiff(history, key, resistanceMax)
  if (!diff) return { ...NONE }
  return {
    available: true,
    since: diff.from.at,
    until: diff.to.at,
    improved: diff.changes.filter((c) => c.improved),
    worsened: diff.changes.filter((c) => !c.improved),
    newlyCapped: diff.newlyCapped,
    newlyUncapped: diff.newlyUncapped,
    unchanged: diff.changes.length === 0,
  }
}
