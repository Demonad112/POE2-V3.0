/**
 * Replacement planning: "if I swap this item out, what should the new one
 * have, and what else has to change to stay capped?"
 *
 * ## What the replacement should carry
 *
 * This module doesn't decide what a build wants from a slot — the item already
 * in it says so. The spec is the same stats, at the best tier this base can
 * hold, plus any resistance the character needs, minus modifiers that are
 * provably wasted (resistance above the cap). Every line comes from the spawn
 * rules for this base, so nothing is suggested that can't roll on it.
 *
 * ## Staying capped
 *
 * Removing an item removes its resistances. For each type, the plan measures
 * how far below the cap the character would fall with the item gone, and how
 * much of that the replacement's spec covers AT ITS MINIMUM ROLL — the
 * conservative case, so the follow-up is never under-sized. Anything left
 * becomes a follow-up: upgrade a non-T1 resistance modifier on another item
 * (on that item, if its level allows), or craft into an open suffix. If
 * neither closes the gap, the plan says the character needs another source.
 */

import type { DefenseSummary } from '../defense/index.js'
import type { EquippedItem } from '../model/slots.js'
import {
  AFFIX_CAPACITY,
  OCCUPIES_AFFIX_SLOT,
  RESIST_STAT,
  type ItemAnalysis,
  type ItemModAnalysis,
} from './analyze.js'
import type { AffixKind, LadderEntry, ModTiers } from './tiers.js'

const ALL_ELEMENTAL = 'base_resist_all_elements_%'
const ELEMENTS = ['fire', 'cold', 'lightning'] as const

export interface SpecLine {
  kind: AffixKind
  /** The stat the line is chosen for. */
  statId: string
  text: string | null
  affix: string | null
  tier: number
  /** Ladder length on this base. */
  tiers: number
  ilvl: number
  min: number
  max: number
  /** What the current item has on this stat, when it has it. */
  current: number | null
  why: 'keep' | 'upgrade' | 'needed-resistance' | 'existing-shortfall'
}

export interface ResistanceImpact {
  type: string
  /** Points this item grants, counting all-elemental lines toward each element. */
  fromItem: number
  /** Resistance total before the cap is applied (value + overcap). */
  uncapped: number
  cap: number
  /** Points below cap with the item removed and nothing in its place. 0 when still capped. */
  deficitIfRemoved: number
  /** What the spec's minimum rolls cover. */
  coveredBySpec: number
  /** Deficit left after the replacement, at its minimum rolls. */
  remaining: number
}

export interface FollowUp {
  /** 1 = do this right after the replacement. */
  step: number
  type: string
  slotLabel: string
  itemName: string
  action: 'upgrade-tier' | 'craft-open-suffix'
  /** Current line, for upgrades. */
  from: { text: string; tier: number | null; value: number } | null
  to: { text: string | null; affix: string | null; tier: number; min: number; max: number; ilvl: number }
  /** Points this closes at the target's minimum roll. */
  closes: number
  note: string
}

export interface ReplacementPlan {
  slotId: number
  slotLabel: string
  itemName: string
  baseType: string
  rarity: string
  /** The item level a base needs for every line in the spec to be able to roll. */
  ilvlNeeded: number | null
  spec: SpecLine[]
  /** Current modifiers left out of the spec, with why. */
  dropped: { text: string; reason: string }[]
  resistances: ResistanceImpact[]
  followUps: FollowUp[]
  /** Deficits the swap causes that no follow-up on current gear can close. */
  uncovered: { type: string; points: number }[]
  /**
   * Shortfalls the character already had, not caused by this swap. Filled from
   * free suffix slots where possible; otherwise listed here, not as follow-ups.
   */
  existingShortfalls: { type: string; points: number; placedInSpec: boolean }[]
  notes: string[]
}

function resistTypeOf(statId: string): string | null {
  return Object.entries(RESIST_STAT).find(([, id]) => id === statId)?.[0] ?? null
}

/** Resistance points an item grants, per type. */
export function resistancesFrom(item: ItemAnalysis): Record<string, number> {
  const out: Record<string, number> = {}
  for (const mod of item.mods) {
    for (const r of mod.rolled) {
      if (r.id === ALL_ELEMENTAL) {
        for (const e of ELEMENTS) out[e] = (out[e] ?? 0) + r.value
        continue
      }
      const type = resistTypeOf(r.id)
      if (type) out[type] = (out[type] ?? 0) + r.value
    }
  }
  return out
}

/** The best line of a ladder for one stat on a base, optionally capped by item level. */
function bestFor(
  tiers: ModTiers,
  kind: AffixKind,
  baseTags: string[],
  statId: string,
  maxIlvl?: number,
  excludeGroups: ReadonlySet<string> = new Set(),
): (LadderEntry & { stat: { id: string; min: number; max: number }; ladderLength: number }) | null {
  const options = tiers
    .available(kind, baseTags, { statIds: [statId], ...(maxIlvl !== undefined ? { maxIlvl } : {}) })
    .filter((entry) => !excludeGroups.has(tiers.raw(entry.id)?.g ?? entry.id))
    .map((entry) => {
      const stat = entry.stats.find((s) => s.id === statId)!
      const ladder = tiers.ladderFor(entry.id, baseTags)
      // Prefer single-stat lines: a hybrid "fire and cold" line is a different
      // modifier with its own trade-offs, and shouldn't masquerade as the fire line.
      return { ...entry, stat, ladderLength: ladder?.entries.length ?? entry.tier, hybrid: entry.stats.length > 1 }
    })
    .sort((a, b) => Number(a.hybrid) - Number(b.hybrid) || b.stat.max - a.stat.max)
  return options[0] ?? null
}

/**
 * The best tier of the modifier's OWN ladder — the same modifier, rolled
 * better. Matching on stat id alone would pair a hybrid line with a plain one.
 */
function ownLadderBest(
  tiers: ModTiers,
  mod: ItemModAnalysis,
  baseTags: string[],
  maxIlvl?: number,
): (LadderEntry & { stat: { id: string; min: number; max: number }; ladderLength: number }) | null {
  if (!mod.id) return null
  const ladder = tiers.ladderFor(mod.id, baseTags)
  const statId = mod.rolled[0]?.id
  if (!ladder || !statId) return null
  const entry = ladder.entries.find((e) => maxIlvl === undefined || e.ilvl <= maxIlvl)
  const stat = entry?.stats.find((x) => x.id === statId)
  if (!entry || !stat) return null
  return { ...entry, stat, ladderLength: ladder.entries.length }
}

function tieredMods(item: ItemAnalysis): ItemModAnalysis[] {
  return item.mods.filter((m) => m.kind !== null && OCCUPIES_AFFIX_SLOT.has(m.source) && m.rolled.length > 0)
}

export interface ReplacementInput {
  target: ItemAnalysis
  /** Every analysed active item, the target included. */
  items: ItemAnalysis[]
  rawItems: EquippedItem[]
  defense: DefenseSummary
  tiers: ModTiers
  /** Cap tiers at what drops at this item level, e.g. 82. Omit for the best that exists. */
  maxIlvl?: number
  /**
   * Resistance types the replacement will NOT carry — the player wants that
   * suffix for something else, or is swapping in a unique. Their deficit goes
   * straight to follow-ups on other items.
   */
  omitResistances?: readonly string[]
}

export function planReplacement({
  target,
  items,
  rawItems,
  defense,
  tiers,
  maxIlvl,
  omitResistances = [],
}: ReplacementInput): ReplacementPlan {
  const notes: string[] = []
  const baseTags = tiers.tagsForBase(target.baseType)
  const capacity = AFFIX_CAPACITY[target.rarity] ?? AFFIX_CAPACITY.Rare!

  if (target.rarity === 'Unique') {
    notes.push(
      `${target.name} is unique — a rare replacement loses its unique effect. The plan below only covers the resistances it provides.`,
    )
  }
  if (target.mods.some((m) => m.source === 'rune')) {
    notes.push('Rune lines have no stat data in the payload, so any resistance they grant is not counted here.')
  }

  // --- resistance impact of removing the item ------------------------------
  const granted = resistancesFrom(target)
  const impact = new Map<string, ResistanceImpact>()
  for (const res of defense.resistances) {
    const fromItem = granted[res.type] ?? 0
    const uncapped = res.value + res.overCap
    const deficitIfRemoved = Math.max(0, res.max - (uncapped - fromItem))
    impact.set(res.type, {
      type: res.type,
      fromItem,
      uncapped,
      cap: res.max,
      deficitIfRemoved,
      coveredBySpec: 0,
      remaining: deficitIfRemoved,
    })
  }

  // --- the spec ------------------------------------------------------------
  const spec: SpecLine[] = []
  const dropped: ReplacementPlan['dropped'] = []
  const slots: Record<AffixKind, number> = { prefix: capacity, suffix: capacity }
  // One line per modifier group: two "% increased Energy Shield" lines on one
  // item are two different groups, and each gets its own best tier.
  const usedGroups = new Set<string>()

  const take = (line: SpecLine, entryId: string): boolean => {
    if (slots[line.kind] <= 0) return false
    slots[line.kind] -= 1
    spec.push(line)
    usedGroups.add(tiers.raw(entryId)?.g ?? entryId)
    return true
  }

  const current = (statId: string) => target.mods.flatMap((m) => m.rolled).find((r) => r.id === statId)?.value ?? null

  const placeResistance = (type: string, why: SpecLine['why']): number | null => {
    const statId = RESIST_STAT[type]
    if (!statId || !baseTags) return null
    const best = bestFor(tiers, 'suffix', baseTags, statId, maxIlvl, usedGroups)
    if (!best) {
      notes.push(`${type} resistance can't roll on ${target.baseType}.`)
      return null
    }
    const ok = take(
      {
        kind: 'suffix',
        statId,
        text: best.text,
        affix: best.affix,
        tier: best.tier,
        tiers: best.ladderLength,
        ilvl: best.ilvl,
        min: best.stat.min,
        max: best.stat.max,
        current: current(statId),
        why,
      },
      best.id,
    )
    return ok ? best.stat.min : null
  }

  if (!baseTags) {
    notes.push(`"${target.baseType}" isn't in the base data, so no replacement lines can be suggested for it.`)
  }

  // 1. Resistances this item is holding up — the lines whose absence has a
  //    measurable cost. Biggest hole first.
  const caused = [...impact.values()]
    .filter((i) => i.fromItem > 0 && i.deficitIfRemoved > 0)
    .sort((a, b) => b.deficitIfRemoved - a.deficitIfRemoved)
  for (const res of caused) {
    if (omitResistances.includes(res.type)) {
      notes.push(`Leaving ${res.type} resistance off the replacement, as asked — the follow-ups below cover what they can of the ${res.deficitIfRemoved}% it held up.`)
      continue
    }
    const min = placeResistance(res.type, 'needed-resistance')
    if (min !== null) {
      res.coveredBySpec = Math.min(res.deficitIfRemoved, min)
      res.remaining = Math.max(0, res.deficitIfRemoved - min)
    }
  }

  // 2. The item's own lines — same stats, best tier this base can hold.
  const ATTRIBUTE = /^(additional_)?(strength|dexterity|intelligence|all_attributes)/
  for (const mod of tieredMods(target)) {
    const stat = mod.rolled[0]!
    const resType = resistTypeOf(stat.id)
    if (resType && spec.some((l) => l.statId === stat.id)) continue
    if (resType && omitResistances.includes(resType)) {
      dropped.push({ text: mod.text, reason: `Left off the replacement, as asked.` })
      continue
    }
    if (mod.waste) {
      dropped.push({ text: mod.text, reason: mod.waste.reason })
      continue
    }
    if (resType && (impact.get(resType)?.deficitIfRemoved ?? 0) === 0) {
      // The character stays capped without it — a free slot for something better.
      const res = defense.resistances.find((r) => r.type === resType)
      dropped.push({
        text: mod.text,
        reason: `${resType} stays capped without this item (${res ? res.value + res.overCap : '?'}% before the cap), so the slot is free for something else.`,
      })
      continue
    }
    if (!baseTags || !mod.kind) continue
    const best = ownLadderBest(tiers, mod, baseTags, maxIlvl) ?? bestFor(tiers, mod.kind, baseTags, stat.id, maxIlvl, usedGroups)
    if (!best) continue
    const ok = take(
      {
        kind: mod.kind,
        statId: stat.id,
        text: best.text,
        affix: best.affix,
        tier: best.tier,
        tiers: best.ladderLength,
        ilvl: best.ilvl,
        min: best.stat.min,
        max: best.stat.max,
        current: stat.value,
        why: best.tier < (mod.tier ?? Infinity) ? 'upgrade' : 'keep',
      },
      best.id,
    )
    if (!ok) {
      dropped.push({
        text: mod.text,
        reason:
          `No ${mod.kind} slot left after the lines above.` +
          (ATTRIBUTE.test(stat.id) ? ' Check you still meet the attribute requirements of your gems and gear without it.' : ''),
      })
    }
  }

  // 3. Shortfalls the character already had go into whatever suffixes are left.
  const existingShortfalls: ReplacementPlan['existingShortfalls'] = []
  for (const res of defense.resistances.filter((r) => r.underCap > 0).sort((a, b) => b.underCap - a.underCap)) {
    if (caused.some((c) => c.type === res.type)) continue
    const placed = slots.suffix > 0 ? placeResistance(res.type, 'existing-shortfall') !== null : false
    existingShortfalls.push({ type: res.type, points: res.underCap, placedInSpec: placed })
    const i = impact.get(res.type)
    if (i) i.remaining = 0
  }

  // --- follow-ups: close what the replacement leaves open -----------------
  const followUps: FollowUp[] = []
  const uncovered: ReplacementPlan['uncovered'] = []
  let step = 1

  for (const res of caused.filter((i) => i.remaining > 0).sort((a, b) => b.remaining - a.remaining)) {
    const statId = RESIST_STAT[res.type]
    if (!statId) continue
    let left = res.remaining

    // 1. Upgrade a non-T1 resistance line on another item, biggest gain first.
    const upgrades = items
      .filter((i) => i.slotId !== target.slotId && i.active && !i.corrupted)
      .flatMap((item) =>
        item.mods
          .filter((m) => m.upgrades.length && m.rolled.some((r) => r.id === statId || r.id === ALL_ELEMENTAL))
          .map((mod) => {
            const stat = mod.rolled.find((r) => r.id === statId || r.id === ALL_ELEMENTAL)!
            const reachable = mod.upgrades.find((u) => u.reachableOnThisItem) ?? null
            const raw = rawItems.find((r) => r.slotId === item.slotId)
            const tags = raw ? tiers.tagsForBase(raw.baseType) : null
            const ladder = mod.id && tags ? tiers.ladderFor(mod.id, tags) : null
            const entry = reachable ? ladder?.entries.find((e) => e.tier === reachable.tier) : null
            const range = entry?.stats.find((s) => s.id === stat.id)
            return { item, mod, stat, reachable, range, entry }
          })
          .filter((x) => x.reachable && x.range && x.range.min > x.stat.value),
      )
      .sort((a, b) => b.range!.min - b.stat.value - (a.range!.min - a.stat.value))

    for (const u of upgrades) {
      if (left <= 0) break
      const closes = Math.min(left, u.range!.min - u.stat.value)
      followUps.push({
        step: step++,
        type: res.type,
        slotLabel: u.item.slotLabel,
        itemName: u.item.name,
        action: 'upgrade-tier',
        from: { text: u.mod.text, tier: u.mod.tier, value: u.stat.value },
        to: {
          text: u.entry!.text,
          affix: u.entry!.affix,
          tier: u.entry!.tier,
          min: u.range!.min,
          max: u.range!.max,
          ilvl: u.entry!.ilvl,
        },
        closes,
        note: `Raises ${res.type} resistance on ${u.item.name} from ${u.stat.value}% to at least ${u.range!.min}%.`,
      })
      left -= closes
    }

    // 2. Craft into an open suffix on another item.
    if (left > 0) {
      for (const item of items) {
        if (left <= 0) break
        if (item.slotId === target.slotId || !item.active || item.corrupted) continue
        const per = AFFIX_CAPACITY[item.rarity]
        if (per === undefined || item.affixCounts.suffix >= per) continue
        if (item.mods.some((m) => OCCUPIES_AFFIX_SLOT.has(m.source) && m.kind === null)) continue
        const raw = rawItems.find((r) => r.slotId === item.slotId)
        const tags = raw ? tiers.tagsForBase(raw.baseType) : null
        if (!tags) continue
        const best = bestFor(tiers, 'suffix', tags, statId, item.itemLevel ?? undefined)
        if (!best) continue
        const closes = Math.min(left, best.stat.min)
        followUps.push({
          step: step++,
          type: res.type,
          slotLabel: item.slotLabel,
          itemName: item.name,
          action: 'craft-open-suffix',
          from: null,
          to: {
            text: best.text,
            affix: best.affix,
            tier: best.tier,
            min: best.stat.min,
            max: best.stat.max,
            ilvl: best.ilvl,
          },
          closes,
          note: `${item.name} has an open suffix; ${res.type} resistance there rolls ${best.stat.min}-${best.stat.max}% at its item level.`,
        })
        left -= closes
      }
    }

    if (left > 0) uncovered.push({ type: res.type, points: left })
  }

  const ilvls = spec.map((l) => l.ilvl)
  return {
    slotId: target.slotId,
    slotLabel: target.slotLabel,
    itemName: target.name,
    baseType: target.baseType,
    rarity: target.rarity,
    ilvlNeeded: ilvls.length ? Math.max(...ilvls) : null,
    spec,
    dropped,
    resistances: [...impact.values()].filter((i) => i.fromItem > 0),
    followUps,
    uncovered,
    existingShortfalls,
    notes,
  }
}
