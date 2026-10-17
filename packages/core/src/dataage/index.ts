import { DATA_AGE_STALE_HOURS } from '../thresholds.js'

/**
 * How old the character data is, read from the timestamp poe.ninja reports.
 *
 * Pure: the caller passes `now`. An absent or unparseable timestamp is
 * `unknown`, never "fresh" and never "stale" — the age is not guessed.
 */
export interface DataAge {
  /** Whole hours since the profile was last updated; null when unknown. */
  hours: number | null
  /** True past `DATA_AGE_STALE_HOURS`; null when the age is unknown. */
  stale: boolean | null
  /** Short human label, e.g. "updated 3 h ago" or "update time unknown". */
  label: string
}

export function dataAge(updatedUtc: string | null | undefined, now: Date, staleAfterHours = DATA_AGE_STALE_HOURS): DataAge {
  if (!updatedUtc) return { hours: null, stale: null, label: 'update time unknown' }
  const then = Date.parse(updatedUtc)
  if (!Number.isFinite(then)) return { hours: null, stale: null, label: 'update time unknown' }
  const ms = now.getTime() - then
  // A timestamp ahead of the clock is a clock problem, not "0 hours old".
  if (ms < 0) return { hours: null, stale: null, label: 'update time unknown' }
  const hours = Math.floor(ms / 3_600_000)
  const label =
    hours < 1 ? 'updated under an hour ago' : hours < 48 ? `updated ${hours} h ago` : `updated ${Math.floor(hours / 24)} d ago`
  return { hours, stale: hours >= staleAfterHours, label }
}
