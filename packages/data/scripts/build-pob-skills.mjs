/**
 * Extract support-gem effects and active-skill types from Path of Building 2.
 *
 * Output: generated/pob-skills.json
 *
 *   supports[]  name, gem family, required/excluded skill-type expressions,
 *               and every constant "+%_final" effect with the PoB modifier it
 *               maps to (name, MORE/INC, flags, and whether it's conditional)
 *   actives{}   active skill name -> its skill types
 *
 * ## Why PoB, and why only this much
 *
 * poe.ninja tells us which supports a skill has, and gems/index.ts already
 * checks two legality rules from the payload. What it can't say is which OTHER
 * supports would work on a skill, or what each one is worth. PoB's skill data
 * answers both from the game files: `requireSkillTypes` is the compatibility
 * rule PoB itself evaluates (calcLib.canGrantedEffectSupportActiveSkill), and
 * `constantStats` holds each support's own fixed values.
 *
 * Only constant values are extracted. Effects that scale with gem level, or
 * whose stat has no local `statMap` entry, are left out rather than guessed —
 * the consumer reports those supports as "not quantified".
 *
 * Usage: POB2_DIR=/path/to/PathOfBuilding-PoE2 node scripts/build-pob-skills.mjs
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pobDir = process.env.POB2_DIR
if (!pobDir) {
  console.error('Set POB2_DIR to a Path of Building PoE2 checkout (github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2).')
  process.exit(1)
}
const skillsDir = join(pobDir, 'src', 'Data', 'Skills')

/** Split a skills file into `skills["Id"] = { ... }` blocks. */
function blocks(file) {
  const text = readFileSync(join(skillsDir, file), 'utf8')
  const out = []
  const re = /^skills\["([^"]+)"\] = \{\n([\s\S]*?)^\}/gm
  let m
  while ((m = re.exec(text))) out.push({ id: m[1], body: m[2] })
  return out
}

function field(body, name) {
  return new RegExp(`^\\t${name} = (.*),$`, 'm').exec(body)?.[1] ?? null
}

function list(raw, pattern) {
  if (!raw) return []
  return [...raw.matchAll(pattern)].map((m) => m[1])
}

/** The first stat set's region between two top-level keys. */
function region(body, start, endPattern) {
  const i = body.indexOf(start)
  if (i < 0) return ''
  const rest = body.slice(i + start.length)
  const end = rest.search(endPattern)
  return end < 0 ? rest : rest.slice(0, end)
}

function parseMods(text) {
  const mods = []
  for (const m of text.matchAll(/\b(mod|flag)\("(\w+)", "(\w+)"([^\n]*)/g)) {
    const rest = m[4]
    mods.push({
      name: m[2],
      type: m[3],
      flags: [...rest.matchAll(/ModFlag\.(\w+)/g)].map((x) => x[1]),
      keywords: [...rest.matchAll(/KeywordFlag\.(\w+)/g)].map((x) => x[1]),
      // Any condition table means the effect only applies some of the time.
      conditions: [...rest.matchAll(/var = "(\w+)"/g)].map((x) => x[1]),
      conditional: rest.includes('{'),
    })
  }
  return mods
}

function parseSupport(id, body) {
  const firstSet = region(body, 'statSets = {', /\n\t\t\[2\] = \{/)
  const statMapText = region(firstSet, 'statMap = {', /\n\t\t\tbaseFlags = \{|\n\t\t\tconstantStats = \{/)
  const statMap = new Map()
  for (const m of statMapText.matchAll(/\["([^"]+)"\] = \{([\s\S]*?)\n\t\t\t\t\},/g)) {
    statMap.set(m[1], parseMods(m[2]))
  }

  const constants = region(firstSet, 'constantStats = {', /\n\t\t\t\},/)
  const effects = []
  // Constant stats with no local statMap entry: PoB maps them globally, and
  // most are plain "increased" modifiers (e.g. attack_speed_+%). Kept raw so
  // the consumer can describe them without pretending to value them.
  const unmapped = []
  for (const m of constants.matchAll(/\{ "([^"]+)", (-?[\d.]+) \}/g)) {
    const stat = m[1]
    const value = Number(m[2])
    const mods = statMap.get(stat)
    if (!mods || !mods.length) {
      unmapped.push({ stat, value })
      continue
    }
    effects.push({ stat, value, mods })
  }

  const statsText = region(firstSet, '\t\t\tstats = {', /\n\t\t\t\},/)
  return {
    id,
    name: JSON.parse(field(body, 'name')),
    description: field(body, 'description') ? JSON.parse(field(body, 'description')) : null,
    family: list(field(body, 'gemFamily'), /"([^"]+)"/g),
    require: list(field(body, 'requireSkillTypes'), /SkillType\.(\w+)/g),
    exclude: list(field(body, 'excludeSkillTypes'), /SkillType\.(\w+)/g),
    lineage: /^\tisLineage = true,$/m.test(body),
    effects,
    unmapped,
    flags: list(statsText, /"([^"]+)"/g),
  }
}

/**
 * Supports that exist as socketable gems, by granted-effect id, with the gem's
 * tier (I/II/III). The skill files also define supports granted only by items
 * or internal effects; a player can't socket those, so they're dropped.
 */
const gemTier = new Map()
{
  const gems = readFileSync(join(pobDir, 'src', 'Data', 'Gems.lua'), 'utf8')
  // One entry at a time: a lazy match across the whole file can run from one
  // gem's granted effect into the next gem's type.
  for (const [, entry] of gems.matchAll(/^\t\["[^"]+"\] = \{\n([\s\S]*?)^\t\},/gm)) {
    const effect = /grantedEffectId = "([^"]+)"/.exec(entry)?.[1]
    if (!effect || !/gemType = "Support"/.test(entry)) continue
    const tier = Number(/\bTier = (\d+)/.exec(entry)?.[1] ?? 0)
    if (!gemTier.has(effect)) gemTier.set(effect, tier)
  }
}

const supports = []
const actives = {}
for (const file of ['sup_str.lua', 'sup_dex.lua', 'sup_int.lua']) {
  for (const { id, body } of blocks(file)) {
    if (!/^\tsupport = true,$/m.test(body)) continue
    if (field(body, 'name') === null || !gemTier.has(id)) continue
    supports.push({ ...parseSupport(id, body), tier: gemTier.get(id) })
  }
}
for (const file of ['act_str.lua', 'act_dex.lua', 'act_int.lua']) {
  for (const { body } of blocks(file)) {
    const name = field(body, 'name')
    const types = field(body, 'skillTypes')
    if (!name || !types) continue
    const key = JSON.parse(name)
    if (actives[key]) continue
    actives[key] = list(types, /\[SkillType\.(\w+)\] = true/g)
  }
}

let commit = null
try {
  commit = execFileSync('git', ['-C', pobDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
} catch {
  // A tarball checkout has no git metadata; the output just says so.
}

supports.sort((a, b) => a.name.localeCompare(b.name))
const out = {
  source: {
    repo: 'PathOfBuilding-PoE2',
    commit,
    license: 'MIT (Path of Building Community)',
    generatedAt: new Date().toISOString().slice(0, 10),
  },
  supports,
  actives,
}
const target = join(here, '..', 'generated', 'pob-skills.json')
writeFileSync(target, JSON.stringify(out))
const quantified = supports.filter((s) => s.effects.length).length
console.log(
  `pob-skills.json: ${supports.length} supports (${quantified} with constant effects), ${Object.keys(actives).length} actives`,
)
