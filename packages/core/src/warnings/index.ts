import type { SupportGem } from '../gems/index.js'
import type { EquippedItem } from '../model/slots.js'

/**
 * Plain-language cautions attached to an upgrade or a setup.
 *
 * Every warning is rule-based: it comes from matching the payload's own text
 * and gem tags, not from measuring anything, and says so (`basis`). A warning
 * never changes a figure or removes a suggestion; it tells the reader what a
 * flat estimate may be getting wrong.
 */
export type WarningKind = 'charm-dependent' | 'minion-dependent' | 'conditional' | 'unique-uncertain'

export interface CardWarning {
  kind: WarningKind
  text: string
  basis: 'rule-based'
  /** The line or gem the warning came from, so it can be checked. */
  source: string
}

const CHARM = /\bcharms?\b/i
// Effects that only apply in some situations, so a flat estimate can overstate them.
const CONDITIONAL = /\b(while|when you|when hit|if you|if an enemy|recently|per (?:\d+ )?(?:charge|stack|stage|rage|endurance|frenzy|power)|against (?:enemies|monsters) (?:that|with|who))\b/i

const isCharm = (item: Pick<EquippedItem, 'name' | 'baseType'>): boolean => CHARM.test(item.name) || CHARM.test(item.baseType)

/** Warnings for one mod line on an item. */
export function modWarnings(line: string, item: Pick<EquippedItem, 'name' | 'baseType' | 'rarity'>): CardWarning[] {
  const out: CardWarning[] = []
  const warn = (kind: WarningKind, text: string): void => {
    out.push({ kind, text, basis: 'rule-based', source: line })
  }
  if (!isCharm(item) && CHARM.test(line)) {
    warn('charm-dependent', 'Only does something while charms are equipped and used.')
  }
  if (CONDITIONAL.test(line)) {
    warn('conditional', 'Applies only in some situations; a flat estimate may overstate it.')
    if (item.rarity === 'Unique') {
      warn('unique-uncertain', 'Unique effects with conditions may not be fully calculated by Path of Building.')
    }
  }
  return out
}

/** Warnings across every mod on an item, one per distinct line and kind. */
export function itemWarnings(item: Pick<EquippedItem, 'name' | 'baseType' | 'rarity' | 'mods'>): CardWarning[] {
  return item.mods.flatMap((m) => modWarnings(m, item))
}

/** Warnings for a support gem, read from the gem's own tags and stat lines. */
export function supportWarnings(support: Pick<SupportGem, 'name' | 'tags' | 'stats'>): CardWarning[] {
  const minion = support.tags.some((t) => /^minion$/i.test(t)) || support.stats.some((s) => /\bminions?\b/i.test(s))
  return minion
    ? [
        {
          kind: 'minion-dependent',
          text: 'Only helps if you have minions; it adds nothing for your own hits.',
          basis: 'rule-based',
          source: support.name,
        },
      ]
    : []
}
