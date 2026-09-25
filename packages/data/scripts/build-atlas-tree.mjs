/**
 * Build the Atlas passive tree artifact.
 *
 * Output: generated/atlas-tree.json, in the same shape as passive-tree.json
 * (x/y/n/k/g/s per node, a flat undirected edge list, the extent), so the web
 * app draws it with the renderer it already has for the character tree. Two
 * extras: `t` on each node names its subtree ("Ritual", "Breach", "Generic"…),
 * and `byName` maps a node name to its ids — names repeat ("Pack Size").
 *
 * ## Source
 *
 * poe2db publishes the game's Atlas tree for its interactive planner:
 *   https://poe2db.tw/data/atlas-skill-tree/4.5/data_us.json
 * "4.5" is poe2db's own version tag for its PoE 2 data, not a game patch. The
 * file contains 0.5.5 nodes (Royal Lenience is new in 0.5.5), which the build
 * checks for. GGG's own tree export (grindinggear/poe2-skilltree-export) has no
 * Atlas tree, and RePoE-fork was unreachable.
 *
 * ## Positions
 *
 * Nodes carry a group, an orbit and an index on that orbit. Position is
 *   x = group.x + r·sin(θ),  y = group.y − r·cos(θ)
 * with r = orbitRadii[orbit] and θ the index's angle. Angles are evenly spaced
 * except on 16- and 40-node orbits, which use the game's fixed tables — the
 * same rule poe2db's own renderer applies.
 *
 * Usage: node packages/data/scripts/build-atlas-tree.mjs [cacheDir]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'generated')
const cacheDir = process.argv[2] ?? join(outDir, '.cache')
const SOURCE = 'https://poe2db.tw/data/atlas-skill-tree/4.5/data_us.json'

mkdirSync(cacheDir, { recursive: true })
const cachePath = join(cacheDir, 'poe2db-atlas-tree.json')
if (!existsSync(cachePath)) {
  process.stderr.write(`fetching ${SOURCE}\n`)
  const res = await fetch(SOURCE)
  if (!res.ok) throw new Error(`${SOURCE} returned ${res.status}`)
  writeFileSync(cachePath, await res.text())
}
const src = JSON.parse(readFileSync(cachePath, 'utf8'))

// --- angles ------------------------------------------------------------------
const FIXED = {
  16: [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330],
  40: [
    0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140, 150, 160, 170, 180, 190, 200, 210, 220,
    225, 230, 240, 250, 260, 270, 280, 290, 300, 310, 315, 320, 330, 340, 350,
  ],
}
const angles = src.constants.skillsPerOrbit.map((n) =>
  (FIXED[n] ?? Array.from({ length: n }, (_, i) => (360 * i) / n)).map((d) => (d * Math.PI) / 180),
)
const radii = src.constants.orbitRadii

// --- nodes -------------------------------------------------------------------
/** "root" has no numeric id; it becomes 0, which no real node uses. */
const idOf = (key) => (key === 'root' ? 0 : Number(key))

const nodes = {}
const byName = {}
let minX = Infinity
let maxX = -Infinity
let minY = Infinity
let maxY = -Infinity

for (const [groupKey, group] of Object.entries(src.groups)) {
  for (const key of group.nodes) {
    const node = src.nodes[key]
    if (!node) continue
    const theta = angles[node.orbit]?.[node.orbitIndex]
    if (theta === undefined) throw new Error(`node ${key}: no angle for orbit ${node.orbit} index ${node.orbitIndex}`)
    const r = radii[node.orbit]
    const x = Math.round(group.x + r * Math.sin(theta))
    const y = Math.round(group.y - r * Math.cos(theta))
    const id = idOf(key)
    const subtree = /^Atlas([A-Z][a-z]+(?:[A-Z][a-z]+)*?)(?:Notable|Small|Keystone|Mastery)?\d+_?$/.exec(node.id ?? '')?.[1]
    nodes[id] = {
      x,
      y,
      n: node.name ?? '',
      k: key === 'root' ? 4 : node.isKeystone ? 2 : node.isNotable ? 1 : 0,
      g: Number(groupKey),
      ...(node.stats?.length ? { s: node.stats.map((l) => l.replace(/\[([^|\]]*\|)?([^\]]*)\]/g, '$2')) } : {}),
      ...(subtree ? { t: subtree } : {}),
    }
    if (node.name) (byName[node.name] ??= []).push(id)
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
}

// The root sits in group 0 on some exports and in no group on others.
if (!nodes[0] && src.nodes.root) nodes[0] = { x: 0, y: 0, n: 'Atlas', k: 4, g: 0 }

// --- edges -------------------------------------------------------------------
const seen = new Set()
const edges = []
// Links live in `connections` ({ id, orbit } — the orbit only bends the drawn
// arc, so lines here are straight); the root's are in `out`.
for (const [key, node] of Object.entries(src.nodes)) {
  const linked = [...(node.out ?? []), ...(node.connections ?? []).map((c) => c.id)]
  for (const other of linked) {
    const a = idOf(key)
    const b = idOf(other)
    const k = a < b ? `${a}-${b}` : `${b}-${a}`
    if (seen.has(k)) continue
    seen.add(k)
    edges.push(a, b)
  }
}

// --- checks ------------------------------------------------------------------
const count = Object.keys(nodes).length
const problems = []
if (count < 500) problems.push(`only ${count} nodes`)
if (edges.length / 2 < 300) problems.push(`only ${edges.length / 2} edges`)
for (let i = 0; i < edges.length; i += 2) {
  if (!nodes[edges[i]] || !nodes[edges[i + 1]]) problems.push(`edge ${edges[i]}-${edges[i + 1]} has a missing end`)
}
if (!byName['Royal Lenience']) problems.push('"Royal Lenience" (new in 0.5.5) is missing — not 0.5.5 data?')
if (problems.length) {
  console.error(problems.slice(0, 20).join('\n'))
  process.exit(1)
}

const artifact = {
  version: 1,
  treeName: 'Atlas-0.5.5',
  generatedFrom: SOURCE,
  nodeCount: count,
  edgeCount: edges.length / 2,
  extent: { minX, maxX, minY, maxY },
  mainExtent: { minX, maxX, minY, maxY },
  classStarts: {},
  ascendancies: [],
  edges,
  nodes,
  byName,
}
const json = JSON.stringify(artifact)
writeFileSync(join(outDir, 'atlas-tree.json'), json)

const subtrees = {}
for (const n of Object.values(nodes)) subtrees[n.t ?? '—'] = (subtrees[n.t ?? '—'] ?? 0) + 1
console.log(`nodes      ${count} (${Object.values(nodes).filter((n) => n.k === 1).length} notable)`)
console.log(`edges      ${edges.length / 2}`)
console.log(`names      ${Object.keys(byName).length} distinct`)
console.log(`subtrees   ${Object.entries(subtrees).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`)
console.log(`extent     x ${minX}..${maxX}, y ${minY}..${maxY}`)
console.log(`size       ${(json.length / 1024).toFixed(0)} KB raw · ${(gzipSync(json, { level: 9 }).length / 1024).toFixed(0)} KB gzipped`)
