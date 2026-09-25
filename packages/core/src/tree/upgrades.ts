/**
 * The best nearby passive nodes, in two lists: damage and effective health.
 *
 * One breadth-first walk from the whole allocated tree gives the real point
 * cost to every node within reach. Each candidate's gain is the sum of what
 * EVERY node on its path grants — the small nodes on the way are allocated
 * too — and the list is ordered by gain per point, so a big gain far away
 * and a small one next door compete on the same footing.
 *
 * ## What is counted, and how
 *
 * Damage: "N% increased … Damage" lines whose qualifiers all apply to the
 * main skill — its damage types, attack or spell, projectile, area. Lines
 * with a condition ("while", "with Bows", "against …") don't end in "Damage"
 * and are never matched, because whether the condition holds isn't known.
 * These are all the same unit (they add into one increased-damage pool), so
 * they compare directly. The real DPS gain is smaller than the percentage,
 * because the pool already holds the build's other increases.
 *
 * Effective health, in three units that are never mixed in one number:
 *  - resistance points that close a shortfall (only up to the cap);
 *  - life + energy shield points; a percentage is converted with the
 *    character's current life or ES, which slightly overstates it because
 *    increases add together — callers say "up to";
 *  - armour / evasion rating, converted the same way.
 * Rows are ordered by unit (a resistance hole first, then pool, then rating)
 * and by gain per point within a unit.
 */

import type { DamageType } from '../model/types.js'
import type { PassiveTree, TreeNode } from './index.js'
import { affectsCharacter } from './suggest.js'

export interface UpgradeSkill {
  name: string
  /** Hit and damage-over-time types the skill deals. */
  types: DamageType[]
  /**
   * Share of the skill's damage each type makes up, 0-1. A type-specific
   * increase only scales its own share: 12% increased physical damage on a
   * skill that is 5% physical is worth 0.6% of the whole.
   */
  share: Partial<Record<DamageType, number>>
  isAttack: boolean
  hasProjectiles: boolean
  hasArea: boolean
  dealsDot: boolean
}

export interface UpgradeCharacter {
  life: number
  energyShield: number
  armour: number
  evasion: number
  /** Points under cap per resistance type; 0 when capped. */
  underCap: Record<string, number>
}

export type EhpUnit = 'resistance' | 'pool' | 'rating'

export interface TreeUpgrade {
  node: TreeNode
  /** Nodes to allocate, target last. */
  path: TreeNode[]
  cost: number
  /** In the list's unit — % increased damage, or the EHP unit below. */
  gain: number
  perPoint: number
  /** Damage list: always 'damage'. */
  unit: 'damage' | EhpUnit
  /** Readable parts, e.g. "+212 life", "+12% fire res". */
  parts: string[]
  /** The stat lines that counted, across the path. */
  lines: string[]
}

export interface TreeUpgrades {
  damage: TreeUpgrade[]
  ehp: TreeUpgrade[]
  /** How far the search looked. */
  maxCost: number
}

const ELEMENTS: DamageType[] = ['fire', 'cold', 'lightning']

/**
 * The fraction of the skill a qualifier word ("fire", "spell", "projectile")
 * applies to: a damage type's share, 1 for a mechanic the skill has, 0 for one
 * it hasn't, null for one the skill data doesn't describe.
 */
function qualifierShare(word: string, skill: UpgradeSkill): number | null {
  const has = (b: boolean) => (b ? 1 : 0)
  switch (word) {
    case 'fire':
    case 'cold':
    case 'lightning':
    case 'chaos':
    case 'physical':
      return skill.share[word] ?? 0
    case 'elemental':
      return ELEMENTS.reduce((n, t) => n + (skill.share[t] ?? 0), 0)
    case 'spell':
      return has(!skill.isAttack)
    case 'attack':
      return has(skill.isAttack)
    case 'projectile':
      return has(skill.hasProjectiles)
    case 'area':
      return has(skill.hasArea)
    case 'melee':
      return has(skill.isAttack && !skill.hasProjectiles)
    default:
      // Totem, trap, herald, grenade… — a mechanic the skill data doesn't
      // describe. Unknown is not "applies".
      return null
  }
}

const INCREASED_DAMAGE = /^(\d+(?:\.\d+)?)% increased (?:([A-Za-z ]+?) )?Damage$/i

/**
 * % increased damage this line adds to the skill as a whole, or 0 — scaled by
 * the share of the skill its damage-type qualifier covers, to one decimal.
 */
export function damageFromLine(line: string, skill: UpgradeSkill): number {
  if (!affectsCharacter(line)) return 0
  const m = INCREASED_DAMAGE.exec(line.trim())
  if (!m) return 0
  const words = (m[2] ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  let share = 1
  for (const w of words) {
    const s = qualifierShare(w, skill)
    if (!s) return 0
    share = Math.min(share, s)
  }
  return Math.round(Number(m[1]) * share * 10) / 10
}

interface EhpGain {
  resistance: Record<string, number>
  pool: { life: number; es: number }
  rating: { armour: number; evasion: number }
}

function emptyEhp(): EhpGain {
  return { resistance: {}, pool: { life: 0, es: 0 }, rating: { armour: 0, evasion: 0 } }
}

/** Add one line's EHP to `into`. Resistance is added raw; capping happens once per path. */
function addEhpLine(line: string, c: UpgradeCharacter, into: EhpGain): boolean {
  if (!affectsCharacter(line)) return false
  const t = line.trim()
  let m: RegExpExecArray | null
  if ((m = /^\+(\d+) to maximum Life$/i.exec(t))) into.pool.life += Number(m[1])
  else if ((m = /^(\d+(?:\.\d+)?)% increased maximum Life$/i.exec(t))) into.pool.life += (c.life * Number(m[1])) / 100
  else if ((m = /^\+(\d+) to maximum Energy Shield$/i.exec(t))) into.pool.es += Number(m[1])
  else if ((m = /^(\d+(?:\.\d+)?)% increased maximum Energy Shield$/i.exec(t)))
    into.pool.es += (c.energyShield * Number(m[1])) / 100
  else if ((m = /^\+(\d+)% to (Fire|Cold|Lightning|Chaos) Resistance$/i.exec(t))) {
    const type = m[2]!.toLowerCase()
    into.resistance[type] = (into.resistance[type] ?? 0) + Number(m[1])
  } else if ((m = /^\+(\d+)% to all Elemental Resistances$/i.exec(t))) {
    for (const e of ELEMENTS) into.resistance[e] = (into.resistance[e] ?? 0) + Number(m[1])
  } else if ((m = /^\+(\d+) to Armour$/i.exec(t))) into.rating.armour += Number(m[1])
  else if ((m = /^(\d+(?:\.\d+)?)% increased Armour$/i.exec(t))) into.rating.armour += (c.armour * Number(m[1])) / 100
  else if ((m = /^\+(\d+) to Evasion Rating$/i.exec(t))) into.rating.evasion += Number(m[1])
  else if ((m = /^(\d+(?:\.\d+)?)% increased Evasion Rating$/i.exec(t)))
    into.rating.evasion += (c.evasion * Number(m[1])) / 100
  else if ((m = /^(\d+(?:\.\d+)?)% increased Armour and Evasion Rating$/i.exec(t))) {
    into.rating.armour += (c.armour * Number(m[1])) / 100
    into.rating.evasion += (c.evasion * Number(m[1])) / 100
  } else return false
  return true
}

/** Cheapest route from the allocated tree to every node within `maxCost`. */
function reach(tree: PassiveTree, allocated: Set<number>, maxCost: number): Map<number, number> {
  const previous = new Map<number, number>()
  const seen = new Set<number>(allocated)
  let frontier = [...allocated]
  for (let depth = 1; depth <= maxCost && frontier.length; depth++) {
    const next: number[] = []
    for (const current of frontier) {
      for (const n of tree.neighbours(current)) {
        if (seen.has(n)) continue
        const node = tree.node(n)
        // Other ascendancy wheels are not reachable by spending points.
        if (!node || node.ascendancy) continue
        seen.add(n)
        previous.set(n, current)
        next.push(n)
      }
    }
    frontier = next
  }
  return previous
}

function pathTo(tree: PassiveTree, previous: Map<number, number>, allocated: Set<number>, id: number): TreeNode[] {
  const path: TreeNode[] = []
  let step: number | undefined = id
  while (step !== undefined && !allocated.has(step)) {
    const node = tree.node(step)
    if (node) path.unshift(node)
    step = previous.get(step)
  }
  return path
}

const round = (n: number) => Math.round(n)

export function suggestTreeUpgrades(
  tree: PassiveTree,
  allocatedIds: Iterable<number>,
  skill: UpgradeSkill | null,
  character: UpgradeCharacter,
  options: { maxCost?: number; limit?: number } = {},
): TreeUpgrades {
  const maxCost = options.maxCost ?? 6
  const limit = options.limit ?? 8
  const allocated = new Set(allocatedIds)
  const previous = reach(tree, allocated, maxCost)

  const damage: TreeUpgrade[] = []
  const ehp: TreeUpgrade[] = []

  for (const id of previous.keys()) {
    const target = tree.node(id)!
    // The target itself must grant something — a list ending on a blank
    // travel node reads as a recommendation to stop halfway.
    const path = pathTo(tree, previous, allocated, id)
    const cost = path.length
    if (!cost) continue

    if (skill) {
      const own = target.stats.reduce((n, s) => n + damageFromLine(s, skill), 0)
      if (own > 0) {
        const lines: string[] = []
        let gain = 0
        for (const node of path)
          for (const s of node.stats) {
            const g = damageFromLine(s, skill)
            if (g > 0) {
              gain += g
              lines.push(s)
            }
          }
        gain = Math.round(gain * 10) / 10
        damage.push({ node: target, path, cost, gain, perPoint: gain / cost, unit: 'damage', parts: [`+${gain}% increased damage`], lines })
      }
    }

    const ownEhp = emptyEhp()
    if (!target.stats.map((s) => addEhpLine(s, character, ownEhp)).some(Boolean)) continue
    const sum = emptyEhp()
    const lines: string[] = []
    for (const node of path) for (const s of node.stats) if (addEhpLine(s, character, sum)) lines.push(s)

    const resClosed: Record<string, number> = {}
    for (const [type, pts] of Object.entries(sum.resistance)) {
      const closes = Math.min(pts, character.underCap[type] ?? 0)
      if (closes > 0) resClosed[type] = closes
    }
    const resTotal = Object.values(resClosed).reduce((a, b) => a + b, 0)
    const pool = round(sum.pool.life + sum.pool.es)
    const rating = round(sum.rating.armour + sum.rating.evasion)
    const parts: string[] = []
    for (const [type, pts] of Object.entries(resClosed)) parts.push(`+${pts}% ${type} res`)
    if (sum.pool.life >= 1) parts.push(`+${round(sum.pool.life)} life`)
    if (sum.pool.es >= 1) parts.push(`+${round(sum.pool.es)} energy shield`)
    if (sum.rating.armour >= 1) parts.push(`+${round(sum.rating.armour)} armour`)
    if (sum.rating.evasion >= 1) parts.push(`+${round(sum.rating.evasion)} evasion`)

    // The unit is the most urgent thing the path delivers.
    const [unit, gain]: [EhpUnit, number] = resTotal > 0 ? ['resistance', resTotal] : pool > 0 ? ['pool', pool] : ['rating', rating]
    if (gain <= 0) continue
    ehp.push({ node: target, path, cost, gain, perPoint: gain / cost, unit, parts, lines })
  }

  const UNIT_ORDER: Record<string, number> = { resistance: 0, pool: 1, rating: 2, damage: 0 }
  const order = (a: TreeUpgrade, b: TreeUpgrade) =>
    UNIT_ORDER[a.unit]! - UNIT_ORDER[b.unit]! || b.perPoint - a.perPoint || a.cost - b.cost || a.node.id - b.node.id

  return { damage: dedupe(damage.sort(order), limit), ehp: dedupe(ehp.sort(order), limit), maxCost }
}

/**
 * Keep one row per target, and drop a row whose target already sits on the
 * path of a better-ranked row — that row's route takes it anyway.
 */
function dedupe(rows: TreeUpgrade[], limit: number): TreeUpgrade[] {
  const out: TreeUpgrade[] = []
  const covered = new Set<number>()
  // Mirrored twins — same name, same cost, same gain on another branch — are
  // one choice to the reader.
  const twins = new Set<string>()
  for (const r of rows) {
    const twin = `${r.node.name}|${r.cost}|${r.parts.join()}`
    if (covered.has(r.node.id) || twins.has(twin)) continue
    twins.add(twin)
    out.push(r)
    for (const n of r.path) covered.add(n.id)
    if (out.length >= limit) break
  }
  return out
}

/** Build the skill description from poe.ninja's per-skill damage block. */
export function upgradeSkillFrom(skill: {
  name: string
  damageSplit: { type: DamageType; percent: number }[]
  dotSplit: { type: DamageType; percent: number }[]
  hitChance: number | null
  projectiles: number | null
  aoeRadius: number | null
  dotDps: number
}): UpgradeSkill {
  // Hit damage decides for a hitting skill; the damage-over-time split only
  // for a skill that does nothing else.
  const split = skill.damageSplit.some((s) => s.percent > 0) ? skill.damageSplit : skill.dotSplit
  const total = split.reduce((n, s) => n + Math.max(0, s.percent), 0)
  const share: Partial<Record<DamageType, number>> = {}
  for (const s of split) if (s.percent > 0 && total > 0) share[s.type] = (share[s.type] ?? 0) + s.percent / total
  const types = Object.keys(share) as DamageType[]
  return {
    name: skill.name,
    types,
    share,
    // Spells always hit; only attacks carry a hit chance.
    isAttack: skill.hitChance !== null,
    hasProjectiles: (skill.projectiles ?? 0) > 0,
    hasArea: (skill.aoeRadius ?? 0) > 0,
    dealsDot: skill.dotDps > 0,
  }
}
