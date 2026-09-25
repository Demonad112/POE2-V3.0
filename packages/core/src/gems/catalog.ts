/**
 * Support-gem catalogue built from Path of Building 2's skill data.
 *
 * gems/index.ts reads what the payload says about the supports a character
 * HAS. This answers the two questions the payload can't:
 *
 * 1. **Could this support go on this skill?** PoB stores each support's
 *    `requireSkillTypes` / `excludeSkillTypes` as a postfix expression over
 *    skill types, and each active skill's types. `canSupport` evaluates it the
 *    same way PoB's `calcLib.doesTypeExpressionMatch` does.
 *
 * 2. **What is it worth on this skill?** Each support's constant "+%_final"
 *    values, with the PoB modifier they map to. `supportValue` applies them to
 *    the skill's own damage split: 25% more Physical on a hit that is 60%
 *    physical is `0.6 x 1.25 + 0.4 = 1.15`, and a support that stops elemental
 *    damage zeroes those shares. That's arithmetic on the gem's figure and the
 *    character's numbers — no invented weights.
 *
 * What it will not do: count conditional effects ("more damage against frozen
 * enemies") as if always on, or guess at effects whose value scales with gem
 * level. Those are reported, not folded into the number.
 */

import type { DamageSplit } from '../dps/index.js'

export interface PobEffectMod {
  name: string
  type: string
  flags: string[]
  keywords: string[]
  conditions: string[]
  conditional: boolean
}

export interface PobSupport {
  id: string
  name: string
  description: string | null
  /** Gem family — two supports of one family can't share a skill. */
  family: string[]
  /** Postfix skill-type expression the target must satisfy. Empty = anything. */
  require: string[]
  exclude: string[]
  lineage: boolean
  /** Gem tier (I = 1, II = 2 …, per PoB's Gems.lua). */
  tier: number
  effects: { stat: string; value: number; mods: PobEffectMod[] }[]
  /** Constant stats with no local modifier mapping — mostly plain "increased" stats. */
  unmapped?: { stat: string; value: number }[]
  /** Plain stat flags, e.g. `deal_no_elemental_damage`. */
  flags: string[]
}

export interface PobSkillData {
  source: { repo: string; commit: string | null; license: string; generatedAt: string }
  supports: PobSupport[]
  actives: Record<string, string[]>
}

/** Evaluate PoB's postfix type expression. Any true value left on the stack matches. */
export function typeExpressionMatches(expression: string[], types: ReadonlySet<string>): boolean {
  const stack: boolean[] = []
  for (const token of expression) {
    if (token === 'OR') {
      const b = stack.pop() ?? false
      const a = stack.pop() ?? false
      stack.push(a || b)
    } else if (token === 'AND') {
      const b = stack.pop() ?? false
      const a = stack.pop() ?? false
      stack.push(a && b)
    } else if (token === 'NOT') {
      stack.push(!(stack.pop() ?? false))
    } else {
      stack.push(types.has(token))
    }
  }
  return stack.some(Boolean)
}

const ELEMENTS = ['fire', 'cold', 'lightning'] as const
const DAMAGE_MOD_TYPES: Readonly<Record<string, readonly string[]>> = {
  Damage: ['physical', 'fire', 'cold', 'lightning', 'chaos'],
  PhysicalDamage: ['physical'],
  FireDamage: ['fire'],
  ColdDamage: ['cold'],
  LightningDamage: ['lightning'],
  ChaosDamage: ['chaos'],
  ElementalDamage: ELEMENTS,
}

/**
 * Whether a PoB modifier's flags apply to a skill with these types. Returns
 * null for a flag this module doesn't understand — the caller treats that as
 * "not quantified" rather than guessing either way.
 */
function flagsApply(mod: PobEffectMod, types: ReadonlySet<string>): boolean | null {
  const hits = types.has('Attack') || types.has('Damage')
  for (const flag of mod.flags) {
    switch (flag) {
      case 'Hit':
        if (!hits) return false
        break
      case 'Attack':
        if (!types.has('Attack')) return false
        break
      case 'Spell':
      case 'Cast':
        if (!types.has('Spell')) return false
        break
      case 'Projectile':
        if (!types.has('Projectile')) return false
        break
      case 'Melee':
        if (!types.has('Melee')) return false
        break
      case 'Area':
        if (!types.has('Area')) return false
        break
      case 'Dot':
        if (!types.has('DamageOverTime')) return false
        break
      default:
        return null
    }
  }
  for (const keyword of mod.keywords) {
    if (keyword === 'Attack' && !types.has('Attack')) return false
    if (keyword === 'Spell' && !types.has('Spell')) return false
    if (keyword !== 'Attack' && keyword !== 'Spell') return null
  }
  return true
}

/**
 * A support whose own description puts a condition on USING the skill — "can
 * only be used after you have moved", "cannot support skills with a cooldown".
 * Its speed figure only holds under that condition, so it's never ranked on its
 * number alone. Read from the gem's description because PoB models the
 * restriction as behaviour, not as a stat.
 */
export function usageRestriction(support: PobSupport): string | null {
  const d = support.description ?? ''
  const sentences = [...d.matchAll(/[^.]*\b(can only be used|only be used after|condition for use|cannot be used)\b[^.]*\./gi)]
  return sentences.length ? sentences.map((m) => m[0].trim()).join(' ') : null
}

/** Human-readable downsides from a support's plain stat flags. */
export function supportTradeoffs(support: PobSupport): string[] {
  const out: string[] = []
  for (const flag of support.flags) {
    if (/^deal_no_|^base_deal_no_|^cannot_|^never_/.test(flag)) {
      out.push(flag.replace(/^base_/, '').replace(/_/g, ' '))
    }
  }
  return out
}

export interface SupportValue {
  /** Multiplier on the skill's hit damage from unconditional effects. */
  damage: number
  /** Multiplier on use speed from unconditional effects. */
  speed: number
  /** damage × speed — the DPS multiplier the gem's own figures imply. */
  dps: number
  /** Effects left out of the number because they only apply some of the time. */
  conditional: { stat: string; value: number; when: string[] }[]
  /** True when every damage/speed effect could be evaluated. */
  quantified: boolean
  /** True when the support has at least one damage or speed effect at all. */
  offensive: boolean
  notes: string[]
}

/**
 * What a support's own figures are worth on one skill.
 *
 * `split` is the skill's hit damage split (percent per type). Typed effects on
 * a skill whose split is unknown are marked unquantified rather than assumed.
 */
export function supportValue(
  support: PobSupport,
  types: ReadonlySet<string>,
  split: readonly DamageSplit[],
): SupportValue {
  const factor: Record<string, number> = { physical: 1, fire: 1, cold: 1, lightning: 1, chaos: 1 }
  let speed = 1
  let quantified = true
  let offensive = false
  let typedEffect = false
  const conditional: SupportValue['conditional'] = []
  const notes: string[] = []

  // "Every third shot": an effect that only fires on every Nth use averages to
  // 1/N of its figure.
  const everyN = (support.unmapped ?? []).find((u) => /every_x_/i.test(u.stat) && u.value > 1)?.value ?? 1
  if (everyN > 1) notes.push(`applies on every ${everyN}th use, so its figures are averaged over ${everyN} uses`)

  for (const effect of support.effects) {
    for (const mod of effect.mods) {
      const isDamage = mod.name in DAMAGE_MOD_TYPES
      const isSpeed = mod.name === 'Speed'
      const gainAs = /^DamageGainAs/.test(mod.name)
      if (!isDamage && !isSpeed && !gainAs) continue
      if (!gainAs && mod.type !== 'MORE') continue
      offensive = true

      const value = effect.value / everyN

      if (gainAs && !mod.conditional) {
        // "Gain X% of damage as extra <type>" adds X% of the hit before any
        // type-specific scaling — counted at that floor.
        const applies = flagsApply(mod, types)
        if (applies) {
          for (const t of Object.keys(factor)) factor[t] = factor[t]! * (1 + value / 100)
          notes.push(`gains ${effect.value}% of damage as extra ${mod.name.replace('DamageGainAs', '').toLowerCase()} (counted before any scaling of that type)`)
        }
        continue
      }

      if (mod.conditional) {
        conditional.push({ stat: effect.stat, value: effect.value, when: mod.conditions })
        continue
      }
      const applies = flagsApply(mod, types)
      if (applies === null) {
        quantified = false
        notes.push(`${effect.stat} has a condition this tool can't evaluate`)
        continue
      }
      if (!applies) continue

      const multiplier = 1 + value / 100
      if (isSpeed) {
        speed *= multiplier
      } else {
        const affected = DAMAGE_MOD_TYPES[mod.name]!
        if (affected.length < 5) typedEffect = true
        for (const t of affected) factor[t] = factor[t]! * multiplier
      }
    }
  }

  // Plain "increased" stats PoB maps globally. Their worth depends on how much
  // of the same stat the character already has, so they're named, not valued.
  for (const u of support.unmapped ?? []) {
    if (!/(damage|speed)/.test(u.stat) || /taken|duration|_life_|mana|movement|penalty|every_x/.test(u.stat)) continue
    offensive = true
    quantified = false
    notes.push(
      `${u.value > 0 ? '+' : ''}${u.value} ${u.stat.replace(/_\+%$/, '%').replace(/_/g, ' ')} — an "increased" modifier, so its worth depends on your other increases`,
    )
  }

  // Supports that forbid damage types: `deal_no_elemental_damage` and friends.
  for (const flag of support.flags) {
    const m = /deal_no_(\w+?)_damage$/.exec(flag)
    if (!m) continue
    const which = m[1] === 'elemental' ? ELEMENTS : [m[1]!]
    for (const t of which) if (t in factor) factor[t] = 0
    typedEffect = true
    offensive = true
  }

  let damage: number
  const shares = split.filter((s) => s.percent > 0)
  if (shares.length) {
    const total = shares.reduce((sum, s) => sum + s.percent, 0)
    damage = shares.reduce((sum, s) => sum + (s.percent / total) * (factor[s.type] ?? 1), 0)
  } else if (typedEffect) {
    // A typed effect on a skill whose split is unknown can't be valued.
    quantified = false
    damage = 1
    notes.push('the skill has no damage split to weigh a typed effect against')
  } else {
    damage = factor.physical!
  }

  return { damage, speed, dps: damage * speed, conditional, quantified, offensive, notes }
}

export class SupportCatalog {
  private readonly byName = new Map<string, PobSupport>()
  private readonly actives = new Map<string, Set<string>>()

  constructor(readonly data: PobSkillData) {
    for (const s of data.supports) this.byName.set(s.name.toLowerCase(), s)
    for (const [name, types] of Object.entries(data.actives)) this.actives.set(name.toLowerCase(), new Set(types))
  }

  support(name: string): PobSupport | null {
    return this.byName.get(name.trim().toLowerCase()) ?? null
  }

  /** The active skill's types, or null when PoB doesn't know the skill by that name. */
  activeTypes(name: string): Set<string> | null {
    return this.actives.get(name.trim().toLowerCase()) ?? null
  }

  canSupport(support: PobSupport, types: ReadonlySet<string>): boolean {
    if (support.exclude.length && typeExpressionMatches(support.exclude, types)) return false
    return !support.require.length || typeExpressionMatches(support.require, types)
  }

  /** Every support gem that could go on a skill with these types. */
  compatible(types: ReadonlySet<string>): PobSupport[] {
    return this.data.supports.filter((s) => this.canSupport(s, types))
  }
}
