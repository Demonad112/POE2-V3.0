import type { Recommendation } from './types.js'

/**
 * Which side of the build a recommendation helps: what it does to damage, or to
 * staying alive. A label only — no figure is produced, so nothing is invented
 * and the existing impact, score and ranking are untouched.
 *
 * `gear` and `efficiency` recommendations do not say which side they serve in
 * their category, so the stat they move decides. A stat that is not recognised
 * is `unclassified`; it is not guessed into either side.
 */
export type RecommendationAxis = 'damage' | 'survivability' | 'unclassified'

const SURVIVABILITY_STATS: ReadonlySet<string> = new Set([
  'lowestMaximumHitTaken',
  'physicalMaximumHitTaken',
  'effectiveHealthPool',
  'armour',
])
const DAMAGE_STATS: ReadonlySet<string> = new Set(['hitChance', 'criticalStrikeMultiplier'])

export function axisOf(rec: Pick<Recommendation, 'category' | 'impact'>): RecommendationAxis {
  if (rec.category === 'damage') return 'damage'
  if (rec.category === 'survivability') return 'survivability'
  const stat = rec.impact?.stat
  if (!stat) return 'unclassified'
  if (/Resistance(OverCap)?$/.test(stat) || SURVIVABILITY_STATS.has(stat)) return 'survivability'
  if (DAMAGE_STATS.has(stat)) return 'damage'
  return 'unclassified'
}

/** Recommendations grouped by axis, each group in its original order. */
export function groupByAxis(recs: readonly Recommendation[]): Record<RecommendationAxis, Recommendation[]> {
  const out: Record<RecommendationAxis, Recommendation[]> = { damage: [], survivability: [], unclassified: [] }
  for (const r of recs) out[axisOf(r)].push(r)
  return out
}
