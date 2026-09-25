/**
 * "Which item should I replace first?"
 *
 * Every reason here is a count read off the item analysis — wasted resistance,
 * lines that need a new base to improve, tiers below the top, empty affix
 * slots — and each is reported as-is. They are ordered, not weighted: a single
 * blended score would claim to know how many tiers of attack speed a wasted
 * resistance line is worth, and the data doesn't say that.
 *
 * The order is:
 *   1. lines that can only improve on a new base — the item has hit its
 *      ceiling, so replacing it is the only way forward;
 *   2. total tiers below the top of each line's ladder — the headroom a
 *      replacement recovers;
 *   3. wasted lines — slots a replacement frees. Ranked below headroom because
 *      one overcap shows up as waste on every item carrying that resistance:
 *      24% spare fire marks each fire line, though only one needs to go;
 *   4. open affix slots;
 * and, between items that tie on all four, the one whose removal opens the
 * smaller resistance hole first — it's the easier swap.
 */

import type { DefenseSummary } from '../defense/index.js'
import { AFFIX_CAPACITY, OCCUPIES_AFFIX_SLOT, type ItemAnalysis } from './analyze.js'
import { removalDeficits } from './replace.js'

export interface ReplacementPriority {
  slotId: number
  slotLabel: string
  itemName: string
  baseType: string
  rarity: string
  corrupted: boolean
  /** 1 = replace first. Null for items that aren't ranked (uniques). */
  rank: number | null
  wasted: { text: string; reason: string }[]
  /** Lines with a better tier only on a higher item-level base. */
  needsNewBase: string[]
  /** Sum of (tier - 1) over the item's tiered lines. */
  tiersBelowTop: number
  /** Empty prefix + suffix slots. Null when an unrecognised line makes the count unreliable. */
  openSlots: number | null
  /** Lines the ladder data couldn't place. */
  unresolved: number
  /**
   * Resistance points the character would newly fall below cap, per type, if
   * the item came off with nothing in its place. Shortfalls it already has are
   * not charged to the item.
   */
  removalCost: Record<string, number>
  /** Plain-language reasons, in the order above. Empty when nothing measurable was found. */
  reasons: string[]
}

export interface ReplacementRanking {
  ranked: ReplacementPriority[]
  /** Uniques: their value is the unique effect, which none of the counts measure. */
  unranked: ReplacementPriority[]
  orderedBy: string
}

const ORDERED_BY =
  'Lines that need a new base to improve first, then total tiers below the top, then wasted lines, then open affix slots. ' +
  'Ties go to the item whose removal opens the smaller resistance hole.'

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)

function assess(item: ItemAnalysis, defense: DefenseSummary): ReplacementPriority {
  const wasted = item.mods.filter((m) => m.waste).map((m) => ({ text: m.text, reason: m.waste!.reason }))
  const needsNewBase = item.mods
    .filter((m) => m.upgrades.length && !m.upgrades.some((u) => u.reachableOnThisItem))
    .map((m) => m.text)
  const tiersBelowTop = item.mods.reduce((n, m) => n + (m.tier !== null && m.tier > 1 ? m.tier - 1 : 0), 0)
  const capacity = AFFIX_CAPACITY[item.rarity]
  const unknownAffix = item.mods.some((m) => OCCUPIES_AFFIX_SLOT.has(m.source) && m.kind === null)
  const openSlots =
    capacity === undefined || unknownAffix
      ? null
      : Math.max(0, capacity - item.affixCounts.prefix) + Math.max(0, capacity - item.affixCounts.suffix)
  const unresolved = item.mods.filter((m) => m.unresolved).length
  const removalCost: Record<string, number> = {}
  for (const [type, deficit] of Object.entries(removalDeficits(item, defense))) {
    const already = defense.resistances.find((r) => r.type === type)?.underCap ?? 0
    if (deficit - already > 0) removalCost[type] = deficit - already
  }

  const reasons: string[] = []
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
  if (needsNewBase.length) reasons.push(`${plural(needsNewBase.length, 'line')} can only improve on a higher item-level base`)
  if (tiersBelowTop) reasons.push(`${plural(tiersBelowTop, 'tier')} below the top, across its lines`)
  if (wasted.length) reasons.push(`${plural(wasted.length, 'line')} with resistance over the cap`)
  if (openSlots) reasons.push(`${plural(openSlots, 'open affix slot')}`)
  if (item.corrupted) reasons.push('corrupted — it can only be replaced, not crafted on')

  return {
    slotId: item.slotId,
    slotLabel: item.slotLabel,
    itemName: item.name,
    baseType: item.baseType,
    rarity: item.rarity,
    corrupted: item.corrupted,
    rank: null,
    wasted,
    needsNewBase,
    tiersBelowTop,
    openSlots,
    unresolved,
    removalCost,
    reasons,
  }
}

/** Rank the character's active gear by how much replacing each item would recover. */
export function rankReplacements(items: ItemAnalysis[], defense: DefenseSummary): ReplacementRanking {
  const assessed = items.filter((i) => i.active).map((i) => assess(i, defense))
  const unranked = assessed.filter((a) => a.rarity === 'Unique')
  const ranked = assessed
    .filter((a) => a.rarity !== 'Unique')
    .sort(
      (a, b) =>
        b.needsNewBase.length - a.needsNewBase.length ||
        b.tiersBelowTop - a.tiersBelowTop ||
        b.wasted.length - a.wasted.length ||
        (b.openSlots ?? 0) - (a.openSlots ?? 0) ||
        sum(a.removalCost) - sum(b.removalCost) ||
        a.slotId - b.slotId,
    )
  ranked.forEach((r, i) => (r.rank = i + 1))
  return { ranked, unranked, orderedBy: ORDERED_BY }
}
