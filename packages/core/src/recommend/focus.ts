import { FOCUS_CATEGORY_WEIGHTS, type FocusMode } from '../thresholds.js'
import type { Recommendation } from './types.js'

/**
 * Mapping / Bossing focus: an optional re-ordering of recommendations.
 *
 * Pure view over the existing list. Each recommendation's own `score` is
 * multiplied by the declared weight for its category (a judgement, see
 * `FOCUS_CATEGORY_WEIGHTS`); nothing is added, dropped or rescored in place.
 * With no focus the list comes back in its original order, so the default view
 * is unchanged.
 */
export function focusView(recs: readonly Recommendation[], focus: FocusMode | null): Recommendation[] {
  if (focus === null) return [...recs]
  const weights = FOCUS_CATEGORY_WEIGHTS[focus]
  const weighted = recs.map((r, i) => ({ r, i, w: r.score * (weights[r.category] ?? 1) }))
  // Stable: equal weighted scores keep their original order.
  weighted.sort((a, b) => b.w - a.w || a.i - b.i)
  return weighted.map((x) => x.r)
}
