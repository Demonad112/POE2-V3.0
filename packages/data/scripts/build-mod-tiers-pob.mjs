/**
 * Rebuild mod-tiers.json from Path of Building 2's own item data, and write
 * bases.json alongside it.
 *
 * Output: generated/mod-tiers.json (same shape as build-mod-tiers.mjs writes)
 *         generated/bases.json     gear bases: type, defences, implicit, requirements
 *
 * ## Why a second builder
 *
 * build-mod-tiers.mjs reads RePoE-fork, which was unreachable when 0.5.5 shipped,
 * so the artifact it last wrote predates the patch. PoB exports the game's item
 * data itself (`src/Data/ModItem.lua`, `ModJewel.lua`, `Bases/*.lua`) and its
 * fork is on hand, so this reads that instead.
 *
 * ## What PoB does not carry: stat ids
 *
 * A PoB mod has its text, level, group and spawn weights, but not the internal
 * stat ids (`additional_strength`) that a character payload reports and that
 * item analysis joins on. Those are carried over, by mod id, from the existing
 * artifact. Every carried-over range is checked against the numbers in PoB's own
 * text for that mod; a mismatch, or a PoB mod with no stat source, fails the
 * build rather than letting a guessed range through. Pass --allow-missing to
 * write the artifact anyway, leaving such mods out.
 *
 * ## What is kept as-is
 *
 * `displayOnly` (implicits, uniques, corrupted — shown, never tiered) lives in
 * other PoB files and is carried over unchanged. Base tags and item classes for
 * non-gear bases (currency and so on) are kept too; PoB's Bases/ only covers
 * equipment.
 *
 * Usage: POB2_DIR=/path/to/PathOfBuilding-PoE2 node scripts/build-mod-tiers-pob.mjs [--allow-missing]
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'generated')
const pobDir = process.env.POB2_DIR
if (!pobDir) {
  console.error('Set POB2_DIR to a Path of Building PoE2 checkout (github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2).')
  process.exit(1)
}
const allowMissing = process.argv.includes('--allow-missing')
const dataDir = join(pobDir, 'src', 'Data')

let pobCommit = null
try {
  pobCommit = execFileSync('git', ['-C', pobDir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
} catch {
  // Not a git checkout; the artifact just won't name a commit.
}

const previous = JSON.parse(readFileSync(join(outDir, 'mod-tiers.json'), 'utf8'))

// --- mods --------------------------------------------------------------------

/** Lua string literals in order, from the start of a table body up to its first `key =`. */
function leadingStrings(rest) {
  const out = []
  const re = /\s*"([^"]*)",/y
  let m
  while ((m = re.exec(rest))) out.push(m[1])
  return out
}

function listField(body, name, pattern) {
  const raw = new RegExp(`${name} = \\{([^}]*)\\}`).exec(body)?.[1] ?? ''
  return [...raw.matchAll(pattern)].map((m) => m[1])
}

function parseModFile(file) {
  const out = {}
  const line = /^\t\["([^"]+)"\] = \{ type = "(Prefix|Suffix)", affix = "([^"]*)",(.*)$/
  for (const text of readFileSync(join(dataDir, file), 'utf8').split('\n')) {
    const m = line.exec(text)
    if (!m) continue
    const [, id, type, affix, rest] = m
    const keys = listField(rest, 'weightKey', /"([^"]+)"/g)
    const vals = listField(rest, 'weightVal', /(-?\d+)/g).map(Number)
    out[id] = {
      t: type === 'Prefix' ? 'p' : 's',
      affix: affix || null,
      lines: leadingStrings(rest),
      lvl: Number(/\blevel = (\d+)/.exec(rest)?.[1] ?? 0),
      g: /\bgroup = "([^"]+)"/.exec(rest)?.[1] ?? null,
      spawn: keys.map((k, i) => [k, vals[i] ?? 0]),
    }
  }
  return out
}

const pobMods = { ...parseModFile('ModItem.lua'), ...parseModFile('ModJewel.lua') }

/** Numbers in display order: "+(5-8) to Strength" -> [5, 8]. */
const numbers = (text) => [...(text ?? '').matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]))

/**
 * Whether the carried-over stat ranges are the ones PoB's text shows. Compared
 * as multisets of absolute values: text order doesn't always follow stat order,
 * and "reduced" lines show a negative stat as a positive number.
 *
 * Stats are stored in internal units and displayed converted — regeneration per
 * minute shows per second (/60), leech and crit chance in permyriad show as a
 * percentage (/100), durations in ms as seconds (/1000) — so each ranged stat
 * may match at one of those scales. A stat with a single fixed value (a flag, or
 * "+3 to maximum Fortification" stored as 15) has no range to get wrong and is
 * not checked.
 */
const DISPLAY_SCALES = [1, 10, 60, 100, 1000]

/**
 * Mods whose text can't show their range, checked by hand: the fishing mods
 * roll an enum (which lure, which hook) and the text names the result, and the
 * rage-delay line's text shows one roll ("1 second") of a 1000-2000 ms range.
 */
const TEXT_CANNOT_SHOW_RANGE = new Set(['FishingLureType', 'FishingHookType', 'BerserkInfluenceRageLossDelay1'])
function rangesAgree(stats, lines) {
  const fromText = lines.flatMap(numbers).map(Math.abs)
  const ranged = stats.filter(([, min, max]) => min !== max)
  return ranged.every(([, min, max]) =>
    DISPLAY_SCALES.some((scale) => {
      const lo = Math.abs(min) / scale
      const hi = Math.abs(max) / scale
      // Display text rounds to two decimals: 8 per minute shows as 0.13.
      const near = (a, b) => Math.abs(a - b) <= 0.005 + 1e-9
      return fromText.some((n) => near(n, lo)) && fromText.some((n) => near(n, hi))
    }),
  )
}

const mods = {}
const missing = []
const mismatched = []
const changed = { group: [], level: [], spawn: [] }
for (const [id, mod] of Object.entries(pobMods)) {
  const prior = previous.mods[id]
  if (!prior) {
    missing.push(id)
    continue
  }
  if (!TEXT_CANNOT_SHOW_RANGE.has(id) && !rangesAgree(prior.stats, mod.lines)) mismatched.push({ id, stats: prior.stats, text: mod.lines })
  if (!mod.g) {
    missing.push(id)
    continue
  }
  if (prior.g !== mod.g) changed.group.push(`${id}: ${prior.g} -> ${mod.g}`)
  if (prior.lvl !== mod.lvl) changed.level.push(`${id}: ${prior.lvl} -> ${mod.lvl}`)
  if (JSON.stringify(prior.spawn) !== JSON.stringify(mod.spawn)) changed.spawn.push(id)
  mods[id] = {
    g: mod.g,
    t: mod.t,
    lvl: mod.lvl,
    name: mod.affix,
    stats: prior.stats,
    // First line only, as before: consumers render `text` as one modifier line.
    text: mod.lines[0] ?? prior.text,
    spawn: mod.spawn,
  }
}
const removed = Object.keys(previous.mods).filter((id) => !pobMods[id])

// --- bases -------------------------------------------------------------------

/** `{ Armour = 80, EnergyShield = 12, }` -> { Armour: 80, EnergyShield: 12 } */
function numberTable(body, name) {
  const raw = new RegExp(`\\n\\t${name} = \\{([^}]*)\\}`).exec(body)?.[1]
  if (raw === undefined) return null
  const out = {}
  for (const m of raw.matchAll(/(\w+) = (-?\d+(?:\.\d+)?)/g)) out[m[1]] = Number(m[2])
  return out
}

/** Item types that are not gear slots a replacement plan covers. */
const NOT_GEAR = new Set(['Flask', 'Charm', 'Jewel', 'Fishing Rod', 'Transcendent Limb'])

const baseTags = { ...previous.baseTags }
const baseClass = { ...previous.baseClass }
const bases = {}
const addedBases = []
const retagged = []
const seen = new Set()
for (const file of readdirSync(join(dataDir, 'Bases')).filter((f) => f.endsWith('.lua'))) {
  const text = readFileSync(join(dataDir, 'Bases', file), 'utf8')
  for (const m of text.matchAll(/^itemBases\["([^"]+)"\] = \{\n([\s\S]*?)^\}/gm)) {
    const [, name, body] = m
    const type = /\n\ttype = "([^"]+)"/.exec('\n' + body)?.[1]
    if (!type) continue
    const tags = Object.keys(
      Object.fromEntries([...(/\ttags = \{([^}]*)\}/.exec(body)?.[1] ?? '').matchAll(/(\w+) = true/g)].map((t) => [t[1], 1])),
    )
    const hidden = /\n\thidden = true/.test('\n' + body)

    // Duplicate names (a hidden copy) carry the same tags; the first one wins.
    if (!seen.has(name)) {
      seen.add(name)
      if (!previous.baseTags[name]) addedBases.push(name)
      else if ([...previous.baseTags[name]].sort().join() !== [...tags].sort().join()) retagged.push(name)
      baseTags[name] = tags
      baseClass[name] = previous.baseClass[name] ?? type
    }

    if (NOT_GEAR.has(type) || bases[name]) continue
    const implicit = /\n\timplicit = "([^"]*)"/.exec('\n' + body)?.[1]
    bases[name] = {
      type,
      subType: /\n\tsubType = "([^"]+)"/.exec('\n' + body)?.[1] ?? null,
      // Spawn tags are in mod-tiers.json's baseTags, keyed by the same name.
      implicit: implicit ? implicit.split('\\n') : [],
      armour: numberTable('\n' + body, 'armour'),
      weapon: numberTable('\n' + body, 'weapon'),
      req: numberTable('\n' + body, 'req') ?? {},
      // Hidden bases and ones the game never sells or drops are kept for lookup
      // but never suggested as something to buy.
      obtainable: !hidden && !tags.includes('not_for_sale'),
    }
  }
}

// --- write -------------------------------------------------------------------

if (missing.length || mismatched.length) {
  console.error(`${missing.length} PoB mods have no stat-id source in the current artifact:`)
  for (const id of missing.slice(0, 20)) console.error(`  ${id}`)
  console.error(`${mismatched.length} mods whose carried-over ranges disagree with PoB's text:`)
  for (const x of mismatched.slice(0, Number(process.env.SHOW ?? 20))) console.error(`  ${x.id}: ${JSON.stringify(x.stats)} vs ${JSON.stringify(x.text)}`)
  if (!allowMissing) {
    console.error('Refusing to write. Resolve these, or pass --allow-missing to leave them out.')
    process.exit(1)
  }
  for (const x of mismatched) delete mods[x.id]
}

const source = `PathOfBuilding-PoE2${pobCommit ? `@${pobCommit}` : ''}`
const artifact = {
  version: 1,
  generatedFrom: [
    `${source} src/Data/ModItem.lua, ModJewel.lua, Bases/*.lua`,
    'stat ids and displayOnly carried over from the RePoE-fork build (build-mod-tiers.mjs)',
  ],
  gameVersion: '0.5.5',
  note: previous.note,
  baseTags,
  baseClass,
  mods,
  displayOnly: previous.displayOnly,
}
const json = JSON.stringify(artifact)
writeFileSync(join(outDir, 'mod-tiers.json'), json)

const basesJson = JSON.stringify({ version: 1, generatedFrom: `${source} src/Data/Bases/*.lua`, gameVersion: '0.5.5', bases })
writeFileSync(join(outDir, 'bases.json'), basesJson)

// --- report ------------------------------------------------------------------
const size = (s) => `${(s.length / 1024).toFixed(0)} KB raw · ${(gzipSync(s, { level: 9 }).length / 1024).toFixed(0)} KB gzipped`
console.log(`PoB source          ${source}`)
console.log(`PoB prefix/suffix   ${Object.keys(pobMods).length}`)
console.log(`kept                ${Object.keys(mods).length} (previously ${Object.keys(previous.mods).length})`)
console.log(`  removed           ${removed.length}${removed.length ? `: ${removed.join(', ')}` : ''}`)
console.log(`  no stat source    ${missing.length}`)
console.log(`  range mismatch    ${mismatched.length}`)
console.log(`  group changed     ${changed.group.length}`)
for (const c of changed.group.filter((c) => !c.startsWith('Jewel'))) console.log(`    ${c}`)
console.log(`  level changed     ${changed.level.length}`)
for (const c of changed.level) console.log(`    ${c}`)
console.log(`  spawn changed     ${changed.spawn.length} (${changed.spawn.filter((id) => !/jewel/i.test(id)).length} outside jewels)`)
console.log(`bases added         ${addedBases.length}${addedBases.length ? `: ${addedBases.join(', ')}` : ''}`)
console.log(`bases retagged      ${retagged.length}`)
console.log(`gear bases          ${Object.keys(bases).length} (${Object.values(bases).filter((b) => b.obtainable).length} obtainable)`)
console.log(`mod-tiers.json      ${size(json)}`)
console.log(`bases.json          ${size(basesJson)}`)
