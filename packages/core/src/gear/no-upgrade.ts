import type { Recommendation } from '../recommend/types.js'
import type { GearSwap, ItemAnalysis } from './analyze.js'

/**
 * Active slots this analysis found nothing to change on.
 *
 * "Nothing flagged" is not "proven optimal": it means no better tier on the
 * item, no wasted points and no recommendation named the slot (plus no swap in
 * `swaps`; the web workbench passes its resistance swaps). A slot whose mods could not be graded at all is listed as not
 * evaluated instead, so missing tier data never reads as a clean bill.
 */
export interface SlotVerdict {
  slotId: number
  slotLabel: string
  itemName: string
  status: 'nothing-flagged' | 'not-evaluated'
  /** Why, in a plain sentence. */
  reason: string
}

export function slotsWithNoFlaggedUpgrade(
  items: readonly ItemAnalysis[],
  recommendations: readonly Recommendation[],
  swaps: readonly GearSwap[] = [],
): SlotVerdict[] {
  const named = new Set<number>()
  for (const r of recommendations) for (const e of r.evidence) if (e.kind === 'item') named.add(e.slotId)
  for (const s of swaps) named.add(s.slotId)

  const out: SlotVerdict[] = []
  for (const item of items) {
    if (!item.active || named.has(item.slotId)) continue
    const graded = item.mods.filter((m) => m.tier !== null)
    const hasBetterTier = item.mods.some((m) => m.upgrades.length > 0)
    const hasWaste = item.mods.some((m) => m.waste !== null)
    if (hasBetterTier || hasWaste) continue
    const base = { slotId: item.slotId, slotLabel: item.slotLabel, itemName: item.name }
    if (graded.length === 0) {
      out.push({ ...base, status: 'not-evaluated', reason: 'None of its mods could be matched to a tier ladder, so it was not graded.' })
    } else {
      out.push({
        ...base,
        status: 'nothing-flagged',
        reason: `${graded.length} graded mod${graded.length === 1 ? '' : 's'}, no better tier, no wasted points, and no recommendation names this slot.`,
      })
    }
  }
  return out.sort((a, b) => a.slotId - b.slotId)
}
