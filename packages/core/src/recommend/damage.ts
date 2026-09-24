/**
 * Damage review: gem and gear changes for one skill.
 *
 * ## Gems
 *
 * For the reviewed skill, each socketed support is checked against Path of
 * Building's compatibility rule and valued with `supportValue` — its own
 * "more" figures applied to this skill's damage split. Candidates are the
 * support gems PoB says fit the skill, minus families already socketed. A swap
 * is suggested only when a candidate's figure beats the support it replaces:
 *
 *   - a support PoB says can't support this skill, or one duplicating a family,
 *     is replaced first — it's contributing nothing;
 *   - otherwise the weakest quantified damage support is compared against the
 *     best candidate.
 *
 * Utility supports (no damage or speed effect) are never suggested for
 * replacement: what they do isn't a damage number, so comparing them on damage
 * would be the kind of judgement this project avoids.
 *
 * The figures are PoB's constant values, unconditional effects only. They are
 * not a DPS simulation: they ignore interactions with the rest of the build
 * (increased-vs-more stacking, ailments, conversion), and say so.
 *
 * ## Gear
 *
 * Damage modifiers on the character's gear that scale what this skill
 * actually deals — its damage types above a 10% share, attack or cast speed by
 * skill kind, skill-level lines that match it — with the tier upgrades
 * gear/analyze.ts already found. Plus, for items with an open slot, the best
 * matching damage line that base can roll.
 */

import type { DpsSummary, SkillDamage } from '../dps/index.js'
import type { SkillSetup } from '../gems/index.js'
import {
  supportTradeoffs,
  supportValue,
  usageRestriction,
  type PobSupport,
  type SupportCatalog,
  type SupportValue,
} from '../gems/catalog.js'
import { AFFIX_CAPACITY, OCCUPIES_AFFIX_SLOT, type ItemAnalysis, type ItemModAnalysis } from '../gear/analyze.js'
import type { AffixKind, ModTiers } from '../gear/tiers.js'
import type { EquippedItem } from '../model/slots.js'
import { CRIT_UNINVESTED } from '../thresholds.js'
import { effectiveCritMultiplier } from './offence.js'

/** A damage type counts as "dealt" at this share of the hit. */
const MIN_SHARE = 10

export interface ReviewedSupport {
  name: string
  known: boolean
  /** Null when PoB doesn't know the support or the skill. */
  compatible: boolean | null
  value: SupportValue | null
  issue: string | null
}

export interface GemCandidate {
  name: string
  tier: number
  lineage: boolean
  description: string | null
  value: SupportValue
  /** A condition on using the skill, quoted from the gem. Restricted gems aren't auto-suggested. */
  restriction: string | null
  /** Downsides the gem states, e.g. "cannot inflict elemental ailments". */
  tradeoffs: string[]
  /** Clashes with the rest of this skill's setup. */
  conflicts: string[]
}

export interface GemSwap {
  replace: ReviewedSupport
  reason: string
  candidates: (GemCandidate & {
    /** DPS ratio versus keeping the replaced support, by the gems' own figures. */
    ratio: number
  })[]
}

export interface DamageGearLine {
  slotLabel: string
  itemName: string
  text: string
  tier: number | null
  toTier: number
  gain: number | null
  reachableOnThisItem: boolean
  ilvl: number
  why: string
}

export interface OpenSlotDamage {
  slotLabel: string
  itemName: string
  kind: AffixKind
  options: { text: string | null; affix: string | null; tier: number; min: number; max: number; ilvl: number }[]
}

export interface DamageReview {
  skill: string
  dps: number
  /** PoB's types for the skill; null when PoB doesn't know it by this name. */
  skillTypes: string[] | null
  dealt: { type: string; percent: number }[]
  supports: ReviewedSupport[]
  gemSwaps: GemSwap[]
  /** Best supports this skill could add, when a socket might be free. */
  strongestCompatible: GemCandidate[]
  gear: DamageGearLine[]
  openSlots: OpenSlotDamage[]
  notes: string[]
}

export interface DamageReviewInput {
  dps: DpsSummary
  setups: SkillSetup[]
  items: ItemAnalysis[]
  rawItems: EquippedItem[]
  tiers: ModTiers | null
  catalog: SupportCatalog
  /** Defaults to the highest-DPS skill. */
  skillName?: string
}

function pickSkill(dps: DpsSummary, name?: string): SkillDamage | null {
  if (name) return dps.skills.find((s) => s.name.toLowerCase() === name.toLowerCase()) ?? null
  return dps.primary ?? dps.skills.find((s) => s.totalDps > 0) ?? null
}

/** Highest tier per family: I, II and III of one gem are one choice. */
function bestPerFamily(supports: PobSupport[]): PobSupport[] {
  const byFamily = new Map<string, PobSupport>()
  for (const s of supports) {
    const key = s.family[0] ?? s.name
    const held = byFamily.get(key)
    if (!held || s.tier > held.tier) byFamily.set(key, s)
  }
  return [...byFamily.values()]
}

/** Which modifier text scales this skill. Returns the reason, or null. */
function scalesSkill(text: string, types: ReadonlySet<string>, dealt: Set<string>, crit: boolean): string | null {
  const t = text.toLowerCase()
  if (/minion|damage taken|reflect|while you|allies/.test(t)) return null
  const attack = types.has('Attack')
  const spell = types.has('Spell')

  if (/level of all/.test(t)) {
    if (/spell/.test(t) && spell) return 'raises the level of spell skills'
    const kind = /(attack|melee|projectile|bow|spear)/.exec(t)?.[1]
    if (kind && attack) {
      if (kind === 'projectile' && !types.has('Projectile')) return null
      if (kind === 'melee' && !types.has('Melee')) return null
      return `raises the level of ${kind} skills`
    }
    for (const e of dealt) if (t.includes(e)) return `raises the level of ${e} skills`
    return null
  }
  for (const e of dealt) {
    if (t.includes(`${e} damage`)) return `this skill deals ${e} damage`
  }
  if (t.includes('elemental damage') && [...dealt].some((e) => e === 'fire' || e === 'cold' || e === 'lightning')) {
    return 'this skill deals elemental damage'
  }
  if (attack && t.includes('attack speed')) return 'this skill is an attack'
  if (spell && t.includes('cast speed')) return 'this skill is a spell'
  if (spell && t.includes('spell damage')) return 'this skill is a spell'
  if (attack && t.includes('attack damage')) return 'this skill is an attack'
  if (types.has('Projectile') && t.includes('projectile damage')) return 'this skill fires projectiles'
  if (types.has('Melee') && t.includes('melee damage')) return 'this skill is melee'
  if (types.has('Area') && t.includes('area damage')) return 'this skill deals area damage'
  if (crit && t.includes('critical')) return 'critical strikes already contribute meaningfully to this skill'
  return null
}

export function reviewDamage(input: DamageReviewInput): DamageReview | null {
  const { dps, setups, items, rawItems, tiers, catalog } = input
  const skill = pickSkill(dps, input.skillName)
  if (!skill) return null

  const notes: string[] = []
  const typeSet = catalog.activeTypes(skill.name)
  if (!typeSet) {
    notes.push(
      `Path of Building has no active skill named "${skill.name}", so gem compatibility can't be checked for it. Gear findings below still apply.`,
    )
  }
  const types = typeSet ?? new Set<string>()
  const split = skill.damageSplit
  const dealt = split.filter((s) => s.percent >= MIN_SHARE).map((s) => ({ type: s.type, percent: s.percent }))
  const dealtSet = new Set(dealt.map((d) => d.type))
  const crit = (effectiveCritMultiplier(skill) ?? 1) >= CRIT_UNINVESTED

  // --- supports on the skill ---------------------------------------------
  const setup = setups.find((s) => s.skill?.toLowerCase() === skill.name.toLowerCase())
  const socketed = setup ? setup.supports.map((s) => s.name) : skill.gems
  const familiesSeen = new Map<string, string>()
  const supports: ReviewedSupport[] = socketed.map((name) => {
    const support = catalog.support(name)
    if (!support) return { name, known: false, compatible: null, value: null, issue: null }
    const compatible = typeSet ? catalog.canSupport(support, types) : null
    let issue: string | null = null
    if (compatible === false) issue = `Path of Building's rules say ${name} can't support ${skill.name}.`
    for (const f of support.family) {
      const other = familiesSeen.get(f)
      if (other) issue = `Same gem family as ${other} — only one of them can apply.`
      else familiesSeen.set(f, name)
    }
    const value = typeSet ? supportValue(support, types, split) : null
    return { name, known: true, compatible, value, issue }
  })

  // Supports already on the skill whose effect needs an elemental ailment.
  const AILMENT_CONDITIONS = /(Frozen|Freeze|Chilled|Shocked|Ignited|Electrocuted)/
  const ailmentReliant = supports
    .filter((s) => s.value?.conditional.some((c) => c.when.some((w) => AILMENT_CONDITIONS.test(w))))
    .map((s) => s.name)

  // --- candidates ---------------------------------------------------------
  const takenFamilies = new Set(
    socketed.flatMap((n) => catalog.support(n)?.family ?? [n]),
  )
  const candidates: GemCandidate[] = typeSet
    ? bestPerFamily(catalog.compatible(types))
        .filter((s) => !s.family.some((f) => takenFamilies.has(f)))
        .map((s) => {
          const tradeoffs = supportTradeoffs(s)
          const conflicts: string[] = []
          if (s.flags.includes('cannot_inflict_elemental_ailments') && ailmentReliant.length) {
            conflicts.push(
              `stops elemental ailments, which ${ailmentReliant.join(', ')} ${ailmentReliant.length === 1 ? 'relies' : 'rely'} on`,
            )
          }
          return {
            name: s.name,
            tier: s.tier,
            lineage: s.lineage,
            description: s.description,
            value: supportValue(s, types, split),
            restriction: usageRestriction(s),
            tradeoffs,
            conflicts,
          }
        })
        .filter((c) => c.value.offensive && c.value.quantified && c.value.dps > 1.0001)
        .sort((a, b) => b.value.dps - a.value.dps)
    : []

  const gemSwaps: GemSwap[] = []
  // Restricted and conflicting gems are shown, never auto-suggested.
  const rank = (current: number) =>
    candidates
      .filter((c) => !c.restriction && !c.conflicts.length)
      .map((c) => ({ ...c, ratio: c.value.dps / current }))
      .filter((c) => c.ratio > 1.0001)
      .slice(0, 3)

  // A support that can't apply (incompatible, or a second gem of one family)
  // contributes nothing, so any candidate is measured against 1.
  for (const s of supports.filter((x) => x.issue)) {
    const options = rank(1)
    if (options.length) gemSwaps.push({ replace: s, reason: s.issue!, candidates: options })
  }
  if (!gemSwaps.length) {
    const weakest = supports
      .filter((s) => s.value?.offensive && s.value.quantified && s.value.conditional.length === 0)
      .sort((a, b) => a.value!.dps - b.value!.dps)[0]
    if (weakest) {
      const options = rank(weakest.value!.dps)
      if (options.length) {
        gemSwaps.push({
          replace: weakest,
          reason: `${weakest.name} is your lowest-value damage support on this skill by the gems' own figures.`,
          candidates: options,
        })
      }
    }
  }
  const unvalued = supports.filter((s) => s.value?.offensive && !s.value.quantified).map((s) => s.name)
  if (unvalued.length) {
    notes.push(
      `${unvalued.join(', ')} ${unvalued.length === 1 ? 'adds' : 'add'} "increased" damage or speed, whose worth depends on your other modifiers — not compared.`,
    )
  }
  const utility = supports.filter((s) => s.known && s.value && !s.value.offensive).map((s) => s.name)
  if (utility.length) {
    notes.push(
      `${utility.join(', ')} ${utility.length === 1 ? 'has' : 'have'} no damage or speed effect in PoB's data — kept as utility and not compared on damage.`,
    )
  }
  const unknown = supports.filter((s) => !s.known).map((s) => s.name)
  if (unknown.length) {
    notes.push(`Not in Path of Building's support data: ${unknown.join(', ')}.`)
  }
  if (skill.isDotOnly || skill.dotDps > skill.dps) {
    notes.push('This skill does most of its damage over time; the gem figures above are weighed against its hit damage split.')
  }

  // --- gear ---------------------------------------------------------------
  const gear: DamageGearLine[] = []
  for (const item of items) {
    if (!item.active || item.corrupted) continue
    for (const mod of item.mods) {
      if (!mod.upgrades.length || mod.tier === null) continue
      const why = scalesSkill(mod.text, types, dealtSet, crit)
      if (!why) continue
      const target = mod.upgrades.find((u) => u.reachableOnThisItem) ?? mod.upgrades[0]!
      gear.push({
        slotLabel: item.slotLabel,
        itemName: item.name,
        text: mod.text,
        tier: mod.tier,
        toTier: target.tier,
        gain: target.gain,
        reachableOnThisItem: target.reachableOnThisItem,
        ilvl: target.ilvl,
        why,
      })
    }
  }
  gear.sort(
    (a, b) =>
      Number(b.reachableOnThisItem) - Number(a.reachableOnThisItem) ||
      (b.tier ?? 0) - b.toTier - ((a.tier ?? 0) - a.toTier),
  )

  const openSlots: OpenSlotDamage[] = []
  if (tiers) {
    for (const item of items) {
      if (!item.active || item.corrupted || item.itemLevel === null) continue
      const per = AFFIX_CAPACITY[item.rarity]
      if (per === undefined) continue
      if (item.mods.some((m: ItemModAnalysis) => OCCUPIES_AFFIX_SLOT.has(m.source) && m.kind === null)) continue
      const raw = rawItems.find((r) => r.slotId === item.slotId)
      const tags = raw ? tiers.tagsForBase(raw.baseType) : null
      if (!tags) continue
      for (const kind of ['prefix', 'suffix'] as const) {
        const used = kind === 'prefix' ? item.affixCounts.prefix : item.affixCounts.suffix
        if (used >= per) continue
        const onItem = new Set(item.mods.map((m) => m.affix))
        const options = tiers
          .available(kind, tags, { maxIlvl: item.itemLevel })
          .filter((e) => e.text && !onItem.has(e.affix) && scalesSkill(e.text, types, dealtSet, crit))
          .slice(0, 3)
          .map((e) => ({
            text: e.text,
            affix: e.affix,
            tier: e.tier,
            min: e.stats[0]?.min ?? 0,
            max: e.stats[0]?.max ?? 0,
            ilvl: e.ilvl,
          }))
        if (options.length) openSlots.push({ slotLabel: item.slotLabel, itemName: item.name, kind, options })
      }
    }
  }

  return {
    skill: skill.name,
    dps: skill.totalDps,
    skillTypes: typeSet ? [...typeSet] : null,
    dealt,
    supports,
    gemSwaps,
    strongestCompatible: candidates.slice(0, 5),
    gear: gear.slice(0, 10),
    openSlots,
    notes,
  }
}
