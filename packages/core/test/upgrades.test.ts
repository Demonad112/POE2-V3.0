/**
 * Best nearby tree nodes, split into damage and effective health.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { PassiveTree, type PassiveTreeData } from '../src/tree/index.js'
import { damageFromLine, suggestTreeUpgrades, upgradeSkillFrom, type UpgradeSkill } from '../src/tree/upgrades.js'
import { normalizePassives } from '../src/model/passives.js'
import { analyzeCharacter, unwrapCharModel } from '../src/analyze.js'

const tree = new PassiveTree(
  JSON.parse(
    readFileSync(fileURLToPath(new URL('../../data/generated/passive-tree.json', import.meta.url)), 'utf8'),
  ) as PassiveTreeData,
)
const payload = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/athrynas-v43.json', import.meta.url)), 'utf8'))
const allocation = normalizePassives(unwrapCharModel(payload))
const analysis = await analyzeCharacter(payload)
const skill = upgradeSkillFrom(analysis.dps.primary!)
const character = {
  life: analysis.defense.life,
  energyShield: analysis.defense.energyShield,
  armour: analysis.defense.armour,
  evasion: analysis.defense.evasion,
  underCap: Object.fromEntries(analysis.defense.resistances.map((r) => [r.type, r.underCap])),
}

const fireSpell: UpgradeSkill = {
  name: 'x',
  types: ['fire'],
  share: { fire: 1 },
  isAttack: false,
  hasProjectiles: true,
  hasArea: false,
  dealsDot: false,
}

describe('damageFromLine', () => {
  it('counts lines whose every qualifier applies to the skill', () => {
    expect(damageFromLine('12% increased Fire Damage', fireSpell)).toBe(12)
    expect(damageFromLine('10% increased Elemental Damage', fireSpell)).toBe(10)
    expect(damageFromLine('8% increased Spell Damage', fireSpell)).toBe(8)
    expect(damageFromLine('8% increased Projectile Damage', fireSpell)).toBe(8)
    expect(damageFromLine('5% increased Damage', fireSpell)).toBe(5)
  })

  it('scales a type-specific line by that type’s share of the skill', () => {
    const mixed = { ...fireSpell, types: ['fire', 'physical'] as UpgradeSkill['types'], share: { fire: 0.8, physical: 0.2 } }
    expect(damageFromLine('10% increased Physical Damage', mixed)).toBe(2)
    expect(damageFromLine('10% increased Elemental Damage', mixed)).toBe(8)
    expect(damageFromLine('10% increased Spell Damage', mixed)).toBe(10)
  })

  it('ignores lines for other types, other entities, and conditions it cannot check', () => {
    expect(damageFromLine('12% increased Cold Damage', fireSpell)).toBe(0)
    expect(damageFromLine('12% increased Attack Damage', fireSpell)).toBe(0)
    expect(damageFromLine('Minions deal 12% increased Damage', fireSpell)).toBe(0)
    expect(damageFromLine('12% increased Totem Damage', fireSpell)).toBe(0)
    expect(damageFromLine('12% increased Damage while on Low Life', fireSpell)).toBe(0)
    expect(damageFromLine('12% increased Spell Area Damage', fireSpell)).toBe(0)
  })
})

describe('suggestTreeUpgrades', () => {
  const result = suggestTreeUpgrades(tree, allocation.live, skill, character, { maxCost: 6, limit: 8 })

  it('returns reachable, unallocated targets with a real path', () => {
    expect(result.damage.length).toBeGreaterThan(0)
    expect(result.ehp.length).toBeGreaterThan(0)
    for (const r of [...result.damage, ...result.ehp]) {
      expect(allocation.live).not.toContain(r.node.id)
      expect(r.cost).toBe(r.path.length)
      expect(r.cost).toBeLessThanOrEqual(6)
      expect(r.path.at(-1)!.id).toBe(r.node.id)
      expect(r.gain).toBeGreaterThan(0)
      expect(r.perPoint).toBeCloseTo(r.gain / r.cost)
      expect(r.node.ascendancy).toBeFalsy()
    }
  })

  it('orders each list by gain per point within a unit', () => {
    for (const list of [result.damage, result.ehp]) {
      for (let i = 1; i < list.length; i++) {
        if (list[i]!.unit === list[i - 1]!.unit) expect(list[i]!.perPoint).toBeLessThanOrEqual(list[i - 1]!.perPoint)
      }
    }
  })

  it('backs every damage gain with lines that apply to the skill', () => {
    for (const r of result.damage) {
      const sum = r.lines.reduce((n, l) => n + damageFromLine(l, skill), 0)
      expect(sum).toBeCloseTo(r.gain, 1)
    }
  })

  it('never lists a target already on a better row’s path', () => {
    for (const list of [result.damage, result.ehp]) {
      const seen = new Set<number>()
      for (const r of list) {
        expect(seen.has(r.node.id)).toBe(false)
        for (const n of r.path) seen.add(n.id)
      }
    }
  })

  it('credits resistance only up to the cap', () => {
    const capped = suggestTreeUpgrades(tree, allocation.live, skill, { ...character, underCap: {} })
    expect(capped.ehp.some((r) => r.unit === 'resistance')).toBe(false)
  })
})
