/**
 * Item bases, and "which other base could this replacement be?"
 *
 * The replacement planner's spec says what the new item should carry. The base
 * it rolls on decides the rest: its defences, its implicit, what it asks of the
 * character's attributes, and which of the spec's lines can spawn on it at all.
 * This compares the bases of one slot on exactly those points and doesn't fold
 * them into a score — a helmet with more armour and less energy shield is not
 * "better" or "worse" without knowing the build's defence plan.
 *
 * Base data comes from Path of Building's `Bases/*.lua` (generated/bases.json).
 */

import type { LadderEntry, ModTiers } from './tiers.js'
import type { ReplacementPlan } from './replace.js'

export interface BaseRaw {
  /** PoB's item type: "Helmet", "Ring", "One Hand Mace". */
  type: string
  /** Defence split for armour ("Armour/Energy Shield"); null for most others. */
  subType: string | null
  /** Implicit lines, verbatim. */
  implicit: string[]
  /** Base defences: Armour, Evasion, EnergyShield, MovementPenalty, BlockChance… */
  armour: Record<string, number> | null
  /** Base weapon stats: PhysicalMin/Max, CritChanceBase, AttackRateBase, Range. */
  weapon: Record<string, number> | null
  /** level, str, dex, int — whichever apply. */
  req: Record<string, number>
  /** False for hidden bases and ones the game never drops or sells. */
  obtainable: boolean
}

export interface BaseData {
  version: number
  generatedFrom: string
  gameVersion?: string
  bases: Record<string, BaseRaw>
}

export class BaseCatalog {
  private readonly data: BaseData

  constructor(data: BaseData) {
    this.data = data
  }

  get size(): number {
    return Object.keys(this.data.bases).length
  }

  get(name: string): BaseRaw | null {
    return this.data.bases[name] ?? null
  }

  /** Obtainable bases of the same item type as `name`, `name` itself included when obtainable. */
  sameSlot(name: string): { name: string; base: BaseRaw }[] {
    const own = this.get(name)
    if (!own) return []
    return Object.entries(this.data.bases)
      .filter(([, b]) => b.type === own.type && b.obtainable)
      .map(([n, base]) => ({ name: n, base }))
  }
}

const RESIST_IMPLICIT = /(Fire|Cold|Lightning|Chaos) Resistance|all Elemental Resistances/i

/** The smallest roll of a numeric implicit: "+(20-30)%" -> 20, "+15%" -> 15. */
function minRoll(line: string): number | null {
  const range = /\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/.exec(line)
  if (range) return Number(range[1])
  const single = /(-?\d+(?:\.\d+)?)/.exec(line)
  return single ? Number(single[1]) : null
}

/** Resistance an implicit grants, per type, at its minimum roll. */
export function implicitResistances(lines: string[]): { type: string; min: number }[] {
  const out: { type: string; min: number }[] = []
  for (const line of lines) {
    const m = RESIST_IMPLICIT.exec(line)
    if (!m) continue
    const min = minRoll(line)
    if (min === null) continue
    const types = m[1] ? [m[1].toLowerCase()] : ['fire', 'cold', 'lightning']
    for (const type of types) out.push({ type, min })
  }
  return out
}

export interface BaseOption {
  name: string
  current: boolean
  subType: string | null
  req: Record<string, number>
  armour: Record<string, number> | null
  weapon: Record<string, number> | null
  implicit: string[]
  /** Spec lines that can roll on this base, with the best that base allows. */
  specFits: number
  /** Spec lines that can't roll on this base at all. */
  lostLines: string[]
  /** Spec lines this base caps lower than the spec asks for: its best tier's minimum is below the spec's. */
  weakerLines: { text: string; specMin: number; baseMin: number }[]
  /** Resistances the implicit grants that the plan needs replaced (minimum roll). */
  implicitCovers: { type: string; min: number }[]
  /** Attributes this base asks for beyond what the character has. Empty when unknown or met. */
  unmetAttributes: { attribute: string; need: number; have: number }[]
}

export interface AlternativeBasesInput {
  plan: ReplacementPlan
  catalog: BaseCatalog
  tiers: ModTiers
  maxIlvl?: number
  /** The character's attribute totals, when the PoB export supplies them. */
  attributes?: Partial<Record<'str' | 'dex' | 'int', number>>
  /** How many alternatives to return, the current base not counted. Default 6. */
  limit?: number
}

export interface AlternativeBases {
  /** The type the bases were drawn from ("Helmet"). Null when the base isn't in the data. */
  type: string | null
  /** The current base first, then the alternatives. */
  options: BaseOption[]
  /** How ordering was decided — shown with the table. */
  orderedBy: string
  notes: string[]
}

const ATTRIBUTE_KEYS = [
  ['str', 'strength'],
  ['dex', 'dexterity'],
  ['int', 'intelligence'],
] as const

function bestEntry(
  tiers: ModTiers,
  kind: 'prefix' | 'suffix',
  tags: string[],
  statId: string,
  maxIlvl?: number,
): (LadderEntry & { min: number }) | null {
  const options = tiers
    .available(kind, tags, { statIds: [statId], ...(maxIlvl !== undefined ? { maxIlvl } : {}) })
    .map((e) => ({ ...e, min: e.stats.find((s) => s.id === statId)!.min, hybrid: e.stats.length > 1 }))
    .sort((a, b) => Number(a.hybrid) - Number(b.hybrid) || b.min - a.min)
  return options[0] ?? null
}

/**
 * Compare the bases of the replaced item's slot against the replacement spec.
 *
 * One base per defence type or implicit (the highest-level one). Ordered by:
 * fewest spec lines lost, then the same defence type as the current
 * base, then the highest level requirement (the top base of its line). Nothing
 * else is ranked; the differences are reported per column.
 */
export function alternativeBases({
  plan,
  catalog,
  tiers,
  maxIlvl,
  attributes,
  limit = 6,
}: AlternativeBasesInput): AlternativeBases {
  const notes: string[] = []
  const own = catalog.get(plan.baseType)
  const orderedBy =
    'The top base of each defence type or implicit, ordered by fewest replacement lines lost, then the same defence type as your current base, then the highest level requirement.'
  if (!own) {
    notes.push(`"${plan.baseType}" isn't in Path of Building's base data, so other bases can't be compared.`)
    return { type: null, options: [], orderedBy, notes }
  }

  const needed = new Set(plan.resistances.filter((r) => r.deficitIfRemoved > 0).map((r) => r.type))

  // Most bases of a slot share a spawn-tag set, so each line is looked up once
  // per distinct set rather than once per base.
  const lookups = new Map<string, ReturnType<typeof bestEntry>>()
  const lookup = (tags: string[], kind: 'prefix' | 'suffix', statId: string) => {
    const key = `${[...tags].sort().join(',')}|${kind}|${statId}`
    if (!lookups.has(key)) lookups.set(key, bestEntry(tiers, kind, tags, statId, maxIlvl))
    return lookups.get(key)!
  }

  const describe = (name: string, base: BaseRaw): BaseOption | null => {
    const tags = tiers.tagsForBase(name)
    if (!tags) return null
    const lostLines: string[] = []
    const weakerLines: BaseOption['weakerLines'] = []
    let specFits = 0
    for (const line of plan.spec) {
      const best = lookup(tags, line.kind, line.statId)
      const label = line.text ?? line.statId
      if (!best) {
        lostLines.push(label)
        continue
      }
      specFits++
      if (best.min < line.min) weakerLines.push({ text: label, specMin: line.min, baseMin: best.min })
    }
    const unmetAttributes: BaseOption['unmetAttributes'] = []
    if (attributes) {
      for (const [key, attribute] of ATTRIBUTE_KEYS) {
        const need = base.req[key]
        const have = attributes[key]
        if (need !== undefined && have !== undefined && need > have) unmetAttributes.push({ attribute, need, have })
      }
    }
    return {
      name,
      current: name === plan.baseType,
      subType: base.subType,
      req: base.req,
      armour: base.armour,
      weapon: base.weapon,
      implicit: base.implicit,
      specFits,
      lostLines,
      weakerLines,
      implicitCovers: implicitResistances(base.implicit).filter((r) => needed.has(r.type)),
      unmetAttributes,
    }
  }

  const current = describe(plan.baseType, own)
  // One base per kind — defence split plus implicit — so the list shows the
  // real choices (an evasion helmet, a ruby ring) rather than five
  // near-identical steps of one line. Within a kind, the top base wins.
  const kindOf = (o: BaseOption) => `${o.subType ?? ''}|${o.implicit.join('|')}`
  const better = (a: BaseOption, b: BaseOption) =>
    a.lostLines.length - b.lostLines.length || (b.req.level ?? 0) - (a.req.level ?? 0) || a.name.localeCompare(b.name)
  const perKind = new Map<string, BaseOption>()
  for (const b of catalog.sameSlot(plan.baseType)) {
    if (b.name === plan.baseType) continue
    const o = describe(b.name, b.base)
    if (!o) continue
    const held = perKind.get(kindOf(o))
    if (!held || better(o, held) < 0) perKind.set(kindOf(o), o)
  }
  const others = [...perKind.values()]
    .sort(
      (a, b) =>
        a.lostLines.length - b.lostLines.length ||
        Number(b.subType === own.subType) - Number(a.subType === own.subType) ||
        better(a, b),
    )
    .slice(0, limit)

  if (!plan.spec.length) notes.push('The replacement spec has no lines, so every base fits it equally.')
  if (!attributes) notes.push('Attribute requirements are shown but not checked — that needs the Path of Building export.')

  return { type: own.type, options: current ? [current, ...others] : others, orderedBy, notes }
}
