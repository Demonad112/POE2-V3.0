/**
 * The gear workbench: try changes to your affixes and see what happens to your
 * resistances before touching the game.
 *
 * A draft is a set of edits on top of the equipped gear — remove a line, set a
 * line to another tier or another affix, add a line to an open slot. The draft
 * resistances are the character's own uncapped totals plus the change in what
 * the gear grants, so removing a +38% fire line shows fire going from 97 to 59
 * (16 under cap), and upgrading another item's T3 fire to T1 shows it climbing
 * back.
 *
 * A new or changed line counts at the BOTTOM of its range: the draft never
 * assumes a lucky roll, so a plan that caps here caps in game.
 *
 * ## Ranking replacement affixes
 *
 * Ordered, never scored:
 *   1. lines that close a resistance the draft leaves under cap (most points first);
 *   2. item rarity;
 *   3. life, energy shield and other defences;
 *   4. damage;
 *   5. attributes;
 *   6. everything else;
 * and within each group, the best tier this item level can roll first.
 */

import type { DefenseSummary } from '../defense/index.js'
import { AFFIX_CAPACITY, OCCUPIES_AFFIX_SLOT, RESIST_STAT, type ItemAnalysis, type ItemModAnalysis } from './analyze.js'
import type { AffixKind, LadderEntry, ModTiers } from './tiers.js'

const ELEMENTS = ['fire', 'cold', 'lightning'] as const
const ALL_ELEMENTAL = 'base_resist_all_elements_%'
const MAX_RESIST: Readonly<Record<string, string>> = Object.freeze({
  fire: 'base_maximum_fire_damage_resistance_%',
  cold: 'base_maximum_cold_damage_resistance_%',
  lightning: 'base_maximum_lightning_damage_resistance_%',
  chaos: 'base_maximum_chaos_damage_resistance_%',
})

export type LineEdit = { kind: 'remove' } | { kind: 'set'; modId: string }

export interface GearDraft {
  /** Keyed by `lineKey(slotId, modIndex)`. */
  edits: Record<string, LineEdit>
  /** Lines put into open slots. */
  added: { key: string; slotId: number; modId: string }[]
}

export const EMPTY_DRAFT: GearDraft = Object.freeze({ edits: {}, added: [] }) as GearDraft

export const lineKey = (slotId: number, modIndex: number) => `${slotId}:${modIndex}`

/** Stat values a mod line grants, as rolled. */
function rolledStats(mod: ItemModAnalysis): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of mod.rolled) out[r.id] = (out[r.id] ?? 0) + r.value
  return out
}

/** Stat values a mod id grants at the bottom of its range. */
export function floorStats(tiers: ModTiers, modId: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, min] of tiers.raw(modId)?.stats ?? []) out[id] = (out[id] ?? 0) + min
  return out
}

function addInto(into: Record<string, number>, stats: Record<string, number>, sign: 1 | -1) {
  for (const [id, v] of Object.entries(stats)) into[id] = (into[id] ?? 0) + sign * v
}

/** Net change in every stat the draft makes, across all items. */
export function draftStatDelta(items: ItemAnalysis[], draft: GearDraft, tiers: ModTiers): Record<string, number> {
  const delta: Record<string, number> = {}
  for (const item of items) {
    item.mods.forEach((mod, i) => {
      const edit = draft.edits[lineKey(item.slotId, i)]
      if (!edit) return
      addInto(delta, rolledStats(mod), -1)
      if (edit.kind === 'set') addInto(delta, floorStats(tiers, edit.modId), 1)
    })
  }
  for (const a of draft.added) addInto(delta, floorStats(tiers, a.modId), 1)
  return delta
}

export interface DraftResistance {
  type: string
  /** Cap before and after the draft (a max-resistance line moves it). */
  max: number
  maxAfter: number
  /** Uncapped totals. */
  before: number
  after: number
  /** Points under cap after the draft; 0 when capped. */
  underCapAfter: number
  overCapAfter: number
  changed: boolean
}

export function draftResistances(defense: DefenseSummary, delta: Record<string, number>): DraftResistance[] {
  return defense.resistances.map((r) => {
    const own = delta[RESIST_STAT[r.type] ?? ''] ?? 0
    const allEle = (ELEMENTS as readonly string[]).includes(r.type) ? (delta[ALL_ELEMENTAL] ?? 0) : 0
    const maxDelta = delta[MAX_RESIST[r.type] ?? ''] ?? 0
    const before = r.value + r.overCap
    const after = before + own + allEle
    const maxAfter = r.max + maxDelta
    return {
      type: r.type,
      max: r.max,
      maxAfter,
      before,
      after,
      underCapAfter: Math.max(0, maxAfter - after),
      overCapAfter: Math.max(0, after - maxAfter),
      changed: own + allEle !== 0 || maxDelta !== 0,
    }
  })
}

/** Tiers of a line's own ladder this item can roll, best first, and those it can't. */
export function tierOptions(
  tiers: ModTiers,
  item: ItemAnalysis,
  modId: string,
): { entry: LadderEntry; reachable: boolean }[] {
  const tags = tiers.tagsForBase(item.baseType)
  const ladder = tags ? tiers.ladderFor(modId, tags) : null
  if (!ladder) return []
  return ladder.entries.map((entry) => ({
    entry,
    reachable: item.itemLevel === null || entry.ilvl <= item.itemLevel,
  }))
}

export type CandidateGroup = 'shortfall' | 'rarity' | 'defence' | 'damage' | 'attribute' | 'other'

export const CANDIDATE_GROUP_LABEL: Readonly<Record<CandidateGroup, string>> = Object.freeze({
  shortfall: 'fixes a resistance',
  rarity: 'item rarity',
  defence: 'defence',
  damage: 'damage',
  attribute: 'attribute',
  other: 'other',
})

export interface AffixCandidate {
  entry: LadderEntry
  ladderLength: number
  group: CandidateGroup
  /** Resistance points under cap this line closes, at the bottom of its range. */
  closes: { type: string; points: number }[]
}

const GROUP_ORDER: CandidateGroup[] = ['shortfall', 'rarity', 'defence', 'damage', 'attribute', 'other']
const NOT_YOU = /minion|ally|allies|companion|totem|enemy|enemies/

function groupOf(statIds: string[]): Exclude<CandidateGroup, 'shortfall'> {
  const any = (re: RegExp) => statIds.some((s) => re.test(s) && !NOT_YOU.test(s))
  if (any(/item_found_rarity/)) return 'rarity'
  if (any(/maximum_life|energy_shield|armour|evasion|resist|block|deflect|life_regeneration|life_leech|stun_threshold/))
    return 'defence'
  if (any(/damage|attack_speed|cast_speed|critical|accuracy|skill_level|gem_level/)) return 'damage'
  if (any(/strength|dexterity|intelligence|attributes/)) return 'attribute'
  return 'other'
}

function closesFor(stats: Record<string, number>, underCap: Record<string, number>): { type: string; points: number }[] {
  const gained: Record<string, number> = {}
  for (const [type, id] of Object.entries(RESIST_STAT)) if (stats[id]) gained[type] = (gained[type] ?? 0) + stats[id]!
  if (stats[ALL_ELEMENTAL]) for (const e of ELEMENTS) gained[e] = (gained[e] ?? 0) + stats[ALL_ELEMENTAL]!
  return Object.entries(gained)
    .map(([type, pts]) => ({ type, points: Math.min(pts, underCap[type] ?? 0) }))
    .filter((c) => c.points > 0)
}

/**
 * Affixes that could go in one slot of an item, ranked as described above.
 *
 * `replacing` is the index of the line being swapped out, so its own group
 * stays available (another tier of the same line is a valid choice); every
 * other group already on the item is excluded — an item can't hold two.
 */
export function rankAffixCandidates({
  tiers,
  item,
  kind,
  draft,
  resistances,
  replacing = null,
}: {
  tiers: ModTiers
  item: ItemAnalysis
  kind: AffixKind
  draft: GearDraft
  resistances: DraftResistance[]
  replacing?: number | null
}): AffixCandidate[] {
  const tags = tiers.tagsForBase(item.baseType)
  if (!tags) return []

  const taken = new Set<string>()
  item.mods.forEach((mod, i) => {
    if (i === replacing) return
    const edit = draft.edits[lineKey(item.slotId, i)]
    if (edit?.kind === 'remove') return
    const id = edit?.kind === 'set' ? edit.modId : mod.id
    const g = id ? tiers.raw(id)?.g : null
    if (g) taken.add(g)
  })
  for (const a of draft.added) if (a.slotId === item.slotId) taken.add(tiers.raw(a.modId)?.g ?? a.modId)

  const underCap = Object.fromEntries(resistances.map((r) => [r.type, r.underCapAfter]))
  const out: AffixCandidate[] = []
  for (const entry of tiers.available(kind, tags, item.itemLevel !== null ? { maxIlvl: item.itemLevel } : {})) {
    const g = tiers.raw(entry.id)?.g ?? entry.id
    if (taken.has(g)) continue
    const stats = floorStats(tiers, entry.id)
    const closes = closesFor(stats, underCap)
    out.push({
      entry,
      ladderLength: tiers.ladderFor(entry.id, tags)?.entries.length ?? entry.tier,
      group: closes.length ? 'shortfall' : groupOf(Object.keys(stats)),
      closes,
    })
  }

  const closed = (c: AffixCandidate) => c.closes.reduce((n, x) => n + x.points, 0)
  return out.sort(
    (a, b) =>
      GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) ||
      closed(b) - closed(a) ||
      a.entry.tier - b.entry.tier ||
      b.entry.ilvl - a.entry.ilvl ||
      a.entry.id.localeCompare(b.entry.id),
  )
}

/** Open prefix/suffix slots on an item after the draft. Null when the rarity has no affix budget. */
export function openSlots(item: ItemAnalysis, draft: GearDraft, tiers: ModTiers): Record<AffixKind, number> | null {
  const capacity = AFFIX_CAPACITY[item.rarity]
  if (capacity === undefined || item.corrupted) return null
  const used: Record<AffixKind, number> = { prefix: 0, suffix: 0 }
  item.mods.forEach((mod, i) => {
    if (!mod.kind || !OCCUPIES_AFFIX_SLOT.has(mod.source)) return
    if (draft.edits[lineKey(item.slotId, i)]?.kind === 'remove') return
    used[mod.kind]++
  })
  for (const a of draft.added) {
    if (a.slotId !== item.slotId) continue
    const t = tiers.raw(a.modId)?.t
    if (t) used[t === 'p' ? 'prefix' : 'suffix']++
  }
  return { prefix: Math.max(0, capacity - used.prefix), suffix: Math.max(0, capacity - used.suffix) }
}

/** Number of edits in the draft, for the "n changes" counter. */
export function draftSize(draft: GearDraft): number {
  return Object.keys(draft.edits).length + draft.added.length
}
