import type { SupportGem } from '../gems/index.js'
import type { EquippedItem } from '../model/slots.js'
import { itemWarnings, supportWarnings, type CardWarning } from '../warnings/index.js'
import type { UpgradeCard } from './types.js'

/**
 * Fills `CardBase.warnings` for a card built from `item` (and, when the card
 * adds or swaps a support, that `support`). Returns a copy; `gain`, `score` and
 * everything else on the card are carried over untouched, and `warnings` is left
 * off when none apply.
 */
export function withCardWarnings<C extends UpgradeCard>(
  card: C,
  item: Pick<EquippedItem, 'name' | 'baseType' | 'rarity' | 'mods'>,
  support?: Pick<SupportGem, 'name' | 'tags' | 'stats'>,
): C {
  const seen = new Set<string>()
  const warnings: CardWarning[] = []
  for (const w of [...itemWarnings(item), ...(support ? supportWarnings(support) : [])]) {
    const key = `${w.kind}|${w.source}`
    if (seen.has(key)) continue
    seen.add(key)
    warnings.push(w)
  }
  return warnings.length ? { ...card, warnings } : card
}
