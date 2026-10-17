import type { EquippedItem } from '../model/slots.js'

/**
 * Ailment immunity, read from what the equipped gear says outright.
 *
 * The poe.ninja payload carries no ailment threshold, avoidance or immunity
 * figure, so exposure cannot be measured. This reads only explicit mod text
 * such as "Cannot be Frozen". Finding such a line proves immunity; finding none
 * proves nothing (the source may be the passive tree or an ascendancy), so the
 * answer is `unknown`, never "exposed".
 */
export type Ailment = 'freeze' | 'chill' | 'shock' | 'ignite' | 'poison' | 'bleed' | 'stun'

export const AILMENTS: readonly Ailment[] = ['freeze', 'chill', 'shock', 'ignite', 'poison', 'bleed', 'stun']

export type AilmentStatus =
  | { ailment: Ailment; status: 'immune'; sources: { slotLabel: string; itemName: string; line: string }[] }
  | { ailment: Ailment; status: 'unknown'; reason: string }

// Past-tense / adjective forms as they appear in "Cannot be Frozen" style lines.
const FORMS: Readonly<Record<Ailment, string>> = {
  freeze: 'froze(?:n)?|freez(?:e|ing)',
  chill: 'chilled|chill(?:ing)?',
  shock: 'shocked|shock(?:ing)?',
  ignite: 'ignited|ignit(?:e|ing)',
  poison: 'poisoned|poison(?:ing)?',
  bleed: 'bleed(?:ing)?|bled',
  stun: 'stunned|stun(?:ning)?',
}

// Everything after the immunity phrase, so "Cannot be Frozen or Chilled" counts for both.
const CLAUSE = /\b(?:cannot be|immune to|can't be|unaffected by)\s+(.*)$/i
// Conditional or non-player lines never prove an unconditional immunity.
const NOT_UNCONDITIONAL = /\b(?:while|if|when|during|against|enemies|allies|minions)\b/i

const PATTERNS = Object.fromEntries(AILMENTS.map((a) => [a, new RegExp(`\\b(?:${FORMS[a]})\\b`, 'i')])) as Record<Ailment, RegExp>

const grants = (mod: string, ailment: Ailment): boolean => {
  if (NOT_UNCONDITIONAL.test(mod)) return false
  const rest = CLAUSE.exec(mod)?.[1]
  return rest !== undefined && PATTERNS[ailment].test(rest)
}

/** A passive node or ascendancy node whose text may grant an immunity. */
export interface AilmentNodeSource {
  name: string
  stats: readonly string[]
  /** Ascendancy class name for ascendancy nodes, null for the main tree. */
  ascendancy: string | null
}

/**
 * "Light Stunned" is only half of stun: heavy stuns still land. A line about it
 * is not an immunity to being stunned, so it never proves one.
 */
const LIGHT_STUN_ONLY = /\blight stun/i

/**
 * `nodes` is the character's allocated passive and ascendancy nodes. Pass
 * `null` when the tree data was not available, which changes only what an
 * `unknown` answer says about why.
 */
export function ailmentImmunities(
  items: readonly Pick<EquippedItem, 'slotLabel' | 'name' | 'mods' | 'active'>[],
  nodes: readonly AilmentNodeSource[] | null = null,
): AilmentStatus[] {
  const holds = (line: string, ailment: Ailment) => grants(line, ailment) && !(ailment === 'stun' && LIGHT_STUN_ONLY.test(line))
  return AILMENTS.map((ailment): AilmentStatus => {
    const fromItems = items
      .filter((i) => i.active)
      .flatMap((i) => i.mods.filter((m) => holds(m, ailment)).map((line) => ({ slotLabel: i.slotLabel, itemName: i.name, line })))
    const fromTree = (nodes ?? []).flatMap((n) =>
      n.stats
        .filter((line) => holds(line, ailment))
        .map((line) => ({ slotLabel: n.ascendancy ? `Ascendancy (${n.ascendancy})` : 'Passive tree', itemName: n.name, line })),
    )
    const sources = [...fromItems, ...fromTree]
    return sources.length
      ? { ailment, status: 'immune', sources }
      : {
          ailment,
          status: 'unknown',
          reason:
            nodes === null
              ? 'No equipped item says so, and the passive tree data was not loaded, so passive and ascendancy sources were not read. The payload has no ailment threshold.'
              : 'No equipped item or allocated passive or ascendancy node says so. The payload has no ailment threshold, and other sources (skills, charms, conditional effects) are not read.',
        }
  })
}
