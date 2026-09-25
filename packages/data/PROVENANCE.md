# Data provenance

This file covers generated game data. The hand-written endgame guide content
(`apps/web/src/data`) and its source precedence are documented in
[`docs/GUIDE_CONTENT.md`](../../docs/GUIDE_CONTENT.md).

## Freshness

`mod-tiers.json` and `bases.json` were regenerated for **0.5.5** on
2026-09-25, from Path of Building 2's own 0.5.5 export (PathOfBuilding-PoE2
`ce566ea`; the data commit is `49e9392` "Export 0.5.5 data", 2026-09-10). See
[`mod-tiers.json` from Path of Building](#mod-tiersjson-from-path-of-building)
below.

The other artifacts were last generated on **2026-07-28**, before patch 0.5.5
(2026-09-04):

- **Soul Core entries.** 0.5.5 reworked about 20 Soul Cores and added 17 (13
  "Jiquani's Soul Core of …", 4 "Atziri's Soul Core of …"). `mod-tiers.json`
  still carries Soul Core base tags and display-only mods from the RePoE build,
  so the new bases are absent and reworked values are the old ones. Nothing
  grades against these: socketed core text reaches the item view verbatim from
  the character payload, and resistances are attributed from poe.ninja's
  `breakdowns`. Limit checks read the item first and fall back to a table in
  `packages/core/src/gear/audit.ts`.
- **Passive tree.** Unchanged by 0.5.5; it needs no regeneration.

To regenerate `mod-tiers.json` and `bases.json` from Path of Building, run from
the repository root:

```bash
POB2_DIR=/path/to/PathOfBuilding-PoE2 npm run build:mod-tiers:pob -w @poe2/data
```

The RePoE-fork route (`npm run build:mod-tiers -w @poe2/data`, then
`build:mods`, `build:mod-bases`, `build:monster-stats`, `build:skills`) needs
`repoe-fork.github.io` to be reachable. Run it first if you want to refresh the
stat ids that the PoB build carries over. Afterwards, update the counts quoted
below and run `npm test`.

## `mod-tiers.json` from Path of Building

Built by `scripts/build-mod-tiers-pob.mjs` from PoB's `src/Data/ModItem.lua`,
`ModJewel.lua` and `Bases/*.lua`.

**What PoB supplies:**

- each mod's level, group, affix name and text;
- its ordered spawn weights (`weightKey`/`weightVal`);
- base tags.

**What it doesn't: stat ids.** PoB has no stat ids (`additional_strength`),
and item analysis joins on them. So the build carries stat ids over by mod id
from the previous, RePoE-derived artifact, and checks every carried-over range
against the numbers in PoB's own text for that mod.

That check has to allow for display scaling. Stats are stored in internal
units and shown converted:

| Stat | Stored as | Shown as |
|---|---|---|
| Life regeneration | per minute | per second (÷60) |
| Leech, crit chance | permyriad | % (÷100) |
| Durations | ms | seconds (÷1000) |

It also allows for two-decimal rounding.

Three mods can't be checked from their text, and are listed in the script:

- the fishing lure and hook mods roll an enum;
- one rage line shows a single roll of its range.

A mod with no stat source, or a range that disagrees, fails the build.
`displayOnly` is carried over unchanged.

**Result against the July artifact:**

| | |
|---|---|
| Mods kept | 2,927 (was 2,962) |
| Removed | 35, all gone from 0.5.5: trap throw speed / trigger radius / cascade speed, master-vendor and essence-only lines |
| Level or roll-range changes | 0 |
| Spawn-weight changes outside jewels | 0 |
| Jewel spawn changes | 377, where PoB writes `jewel: 0` instead of `default: 0` (equivalent for jewels) |
| Group changes | 122, all jewel mods; PoB splits crafted-jewel groups more finely |
| Bases added | 5: Energy Blade 1H/2H, three Shrine Sceptres |
| Bases retagged | 66, where PoB adds `genesis_tree_*` and `*_implicit_skill` tags |

In short, 0.5.5 changed no affix ladder the planner uses. The data is now
stamped as 0.5.5 rather than assumed to be.

## `generated/bases.json`

Written by the same script. It covers every equipment base (flasks, charms,
jewels, fishing rods and Transcendent limbs excluded):

- PoB item type and defence split (`subType`);
- implicit lines;
- base defences or weapon stats;
- requirements (level, Str/Dex/Int);
- whether the base is obtainable. Hidden bases and `not_for_sale` bases are
  never suggested.

Spawn tags are not duplicated here; they live in `mod-tiers.json` `baseTags`.

The replacement planner uses it to compare other bases for a slot. Totals:
1,716 gear bases, 1,460 of them obtainable; 352 KB raw, 30 KB gzipped. The web
build copies it to `apps/web/public/`.

## `generated/passive-tree.json`

Built by `scripts/build-tree.mjs` from `data/psg_passive_nodes.json` in
[Demonad112/poe2-mcp](https://github.com/Demonad112/poe2-mcp) (2.06 MB, 4,975
nodes). Regenerate with:

```bash
node packages/data/scripts/build-tree.mjs /path/to/poe2-mcp/data/psg_passive_nodes.json
```

| | |
|---|---|
| Tree | `PassiveTree-0.5` |
| Nodes | 4,975 |
| Edges | 5,887 undirected |
| Notables / keystones / jewel sockets | 968 / 30 / 12 |
| Ascendancy nodes | 353 across 19 classes |
| Size | 602 KB raw · 147 KB gzipped |

The web build copies this to `apps/web/public/passive-tree.json`
(`prebuild` → `sync-data`); that copy is generated and gitignored.

### What the build script corrects

Three properties of the source would produce wrong output if used as-is. All
three were verified against the data, not assumed.

**Connections are stored directed.** Of 5,888 stored entries exactly one is
reciprocated. Rendering straight from the field draws each link once with an
arbitrary owner — survivable — but any graph walk (path finding, connectivity)
silently gets a one-way tree. The artifact carries a de-duplicated *undirected*
edge list.

**One self-loop exists.** Node 35653 ("Grenade Damage") connects to itself. It
draws nothing and makes edge counts disagree with themselves, so it is dropped —
leaving 5,887 real edges from 5,888 entries.

**`is_ascendancy` does not mean "is an ascendancy passive".** It is set on 17
nodes, which are the ascendancy *class* nodes ("Deadeye", "Titan", …) — not the
353 passives on the wheels. Structural detection fails too: the whole graph is a
single connected component, so the wheels cannot be separated by walking it. The
reliable signal is the icon path, whose subfolder names the ascendancy
(`passives/DeadEye/…`). That is what the script uses.

### Coordinate space and framing

Full extent spans x −22597…21814, y −18721…20054, but the ascendancy wheels are
small clusters at the periphery (Deadeye sits near x 15000, y 5000). The artifact
therefore also carries `mainExtent`, excluding them, and the renderer frames
against the character's *allocated* nodes rather than either — the full extent is
mostly empty space and other classes' wheels.

### Class start nodes

`47175` Warrior · `50459` Ranger · `54447` Sorceress · `50986` Mercenary ·
`61525` Druid · `44683` Monk. Their `name` fields carry PoE1 legacy labels
(`MARAUDER`, `RANGER`, `WITCH`, …), so the display names above come from the
build script, not the data.

## `generated/pob-skills.json`

Support-gem effects and active-skill types, extracted from
[Path of Building PoE2](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2)
(`src/Data/Skills/sup_*.lua`, `act_*.lua`, `Gems.lua`). MIT licensed, Path of
Building Community.

```
POB2_DIR=/path/to/PathOfBuilding-PoE2 npm run build:pob-skills -w @poe2/data
```

The output records the source commit. What's kept:

- **Supports** that exist as socketable gems (Gems.lua `gemType = "Support"`):
  name, gem family, tier, the `requireSkillTypes` / `excludeSkillTypes`
  postfix expressions, and every constant stat. Stats with a local `statMap`
  entry carry the PoB modifier they map to (name, MORE/INC, flags, and whether
  a condition table is attached); the rest are kept raw under `unmapped`.
- **Actives**: skill name → skill types.

What's deliberately not kept: effects whose value scales per gem level. The
damage review reports those supports as "not quantified" rather than guessing.

## Licensing

Passive tree data derives from Path of Exile 2, © Grinding Gear Games. It is
included here for interoperability in an unofficial fan tool. See the repository
`LICENSE`.

## `generated/mods.json` and `generated/mod-bases.json`

Two artifacts, two sources, because neither alone is sufficient.

**`mod-tiers.json`** — the affix ladders. Built by `scripts/build-mod-tiers.mjs`
from [RePoE-fork](https://repoe-fork.github.io/poe2/) `mods.min.json` and
`base_items.min.json`, plus [pob-data](https://repoe-fork.github.io/pob-data/poe2/)
`ModItem.min.json`. 2,585 craftable prefixes and suffixes across 594 ladders,
plus 5,220 display-only mods (implicits, corrupted, unique) and 4,494 base names
with their spawn tags. 2.0 MB raw, 0.26 MB gzipped.

**`monster-stats.json`** — base monster damage by area level, waystone tier to
area level, and Path of Building's boss reference levels. From RePoE
`default_monster_stats` and `base_items`, plus pob-data `WorldAreas`. 4.6 KB raw,
1.9 KB gzipped.

### A second correction

An earlier version of this artifact asserted that map tier is **not derivable**,
because `WorldAreas` carries no tier field and its 158 endgame maps use only six
distinct levels. That observation was right; the conclusion was wrong. I had
looked in one place.

Waystones are *items*. `base_items.json` lists `Waystone (Tier 1..16)` with item
class `Map`, and their `drop_level` equals **64 + tier** for every tier from 2 to
16. Tier 1 lists 58 — where the item begins dropping in the late campaign, not
the map's own level — and 64 + 1 = 65, which WorldAreas independently confirms.

Four separate corroborations:

- `drop_level == 64 + tier` for all 15 of tiers 2–16
- WorldAreas' real map levels 65 / 74 / 75 / 79 / 80 are exactly tiers 1 / 10 / 11 / 15 / 16
- the highest waystone (T16) sits at 80, the highest map level in WorldAreas
- pob-data `Misc.mapLevelLifeMult` is keyed 66–90, starting one above tier 1

The build script fails if more than one tier ever stops matching the formula,
rather than silently drifting.

**Boss levels** are quoted from
[PathOfBuildingCommunity/PathOfBuilding-PoE2](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2),
`src/Modules/ConfigOptions.lua`, the `enemyLevel` tooltip: *"The maximum level
for normal enemies and all bosses is 85"* and *"The default and minimum level for
pinnacle bosses and uber pinnacle bosses is 82."* Those are prose constants, so
they are written out with their source rather than scraped.

**Still not modelled:** rare and unique monster damage multipliers, and map
modifiers. So the headroom figure is an upper bound against a normal monster,
never a verdict that a tier is safe.

**`mods.json`** — affix names and roll windows, keyed by mod text. Built by
`scripts/build-mods.mjs` from `data/game/mods/mods.json` joined to
`stat_descriptions.json`, both from Demonad112/poe2-mcp. 12,601 mods across
3.4 MB raw, 0.36 MB gzipped. **Carries no tier numbers** — see below.

### Why tier numbers were removed from `mods.json`

They were wrong, and the conclusion is stronger than the bug.

The first grouping used `stat_id | generation_type`. That produced a "tier 1"
rolling LOWER than the bottom tier in **375 of 1,103 families**, because
unrelated ladders share a stat id: `base_resist_all_elements_%` as a SUFFIX
covers both the real all-resistance ladder and the Hand Wraps
"of Covering / of Sheathing / of Lining" ladder.

The second attempt joined RePoE's published ladder key by mod id. Better — 87%
correct — but the remaining 33 violations were all per-class and essence
variants sharing a group with the generic ladder
(`SpellCriticalStrikeChanceRing6`, `LightningResistancePenetrationEssence4`).

That is not a bug to patch. **A tier is meaningless without an item class.** So
tiers live in `mod-tiers.json`, resolved per base at query time, and this
artifact carries roll windows and affix names only.

**`mod-bases.json`** — which item class each modifier can appear on, and whether
as prefix or suffix. Built by `scripts/build-mod-bases.mjs` from
[RePoE-fork](https://repoe-fork.github.io/poe2/) `mods_by_base.min.json` and
`base_items.min.json`. 2,585 mods across 53 item classes, plus 1,722 base names
mapped to their class; 267 KB raw, 24 KB gzipped.

### A correction worth recording

An earlier version of this project asserted that mod-to-item-base compatibility
"is not derivable from the available data". That was true of the first source
only — its `type_key` looks like an index into `spawn_tags` and is not, mapping
attack speed to belts alone and flat energy shield to bows and to non-item tags
like `Claw_onhit_audio`, with only 11,403 of 16,788 keys even in range.

It was wrong as a general claim, and RePoE-fork disproved it. The two sources
share a mod-id namespace (2,795 of RePoE's 3,450 ids appear in the tier table),
so they join cleanly.

### Two naming traps in the RePoE join

- `mods_by_base.json` uses plural class names ("Bows", "Body Armours");
  `base_items.json` uses singular ("Bow", "Body Armour"). Matching on exact
  equality silently drops every weapon — the build script bridges them and
  reports anything left unmatched.
- `unique` mods are excluded: they appear on specific uniques rather than
  through crafting, so including them would let anything validate anywhere.
