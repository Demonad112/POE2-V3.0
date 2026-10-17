import type { EssenceEntry, PatchDelta, RegexEntry, TrialModifier } from "@/lib/types";
import { digestSource, patchSource } from "./sourceMeta";

/**
 * 0.5.5 "Forbidden Rites" endgame reference: what changed from 0.5.0, the Trial
 * of Chaos rework, deterministic essence crafting and the in-game search
 * strings. Rows already confirmed elsewhere in the guide carry patchSource();
 * anything only the endgame update spec states is a digest claim, so it shows
 * as unverified until a patch note or video backs it.
 */
const SPEC_ONLY =
  "From the 0.5.5 endgame update spec, which cites the official patch notes and creator guides. Not re-read against them here.";

export const patchDeltas: PatchDelta[] = [
  {
    id: "delta-fortress-unlock",
    system: "Precursor Fortress full unlock",
    before: "Arbiter of Divinity ×5, each kill unlocking one Cardinal Device region (~40 points).",
    now: "2 kills total. The quest Origin Core kill no longer completes a Fortress section; the second, non-quest kill completes the whole Fortress for the map owner.",
    source: patchSource({
      verified: "conflicting",
      note: "Fubgun's pre-launch video says kill #1 completes one section; the patch notes say it no longer does. Both agree kill #2 unlocks everything.",
    }),
  },
  {
    id: "delta-hall-spawns",
    system: "Matriarch and Patriarch Halls",
    before: "Spawned deep in the outer Atlas fog.",
    now: "Spawn much closer to the Ziggurat Refuge, always as a pair, visible as a smooth orange beam in the fog.",
    source: digestSource(SPEC_ONLY),
  },
  {
    id: "delta-boss-resists",
    system: "Pinnacle boss resistances",
    before: "Arbiter of Ash, Arbiter of Divinity, Omniphobia and Raven Trickster all had +75% All Elemental Resistances.",
    now: "Ash: Fire Resistance and Cold Vulnerability. Divinity: 45% Lightning Resistance and Fire Vulnerability (0% Cold). Omniphobia and Raven Trickster: no All Elemental Resistance.",
    source: patchSource(),
  },
  {
    id: "delta-rakiata",
    system: "Rakiata's Flow",
    before: "A near-mandatory chase gem that inverted the +75% boss resistances.",
    now: "Unequip it on Fire or Tri-Elemental (Trinity) builds against Arbiter of Divinity: inverting Fire Vulnerability gives it positive Fire Resistance. Lightning builds bring Lightning Exposure or a curse instead.",
    source: digestSource(SPEC_ONLY),
  },
  {
    id: "delta-corrupted-nexus",
    system: "Corrupted Nexus failures",
    before: "Failing a Nexus, or dying and respawning on its map boss, could stop the Corrupted Boss spawning.",
    now: "A failed Corrupted Nexus can be retried, and dying on the map boss no longer stops the Corrupted Boss spawning.",
    source: digestSource(SPEC_ONLY),
  },
  {
    id: "delta-expedition",
    system: "Runes of Aldur and Expedition",
    before: "League-only mechanic with no Expedition Tablets; needed Aldur's Saga, which stays Runes of Aldur-only.",
    now: "Core from Act 4. Expedition Tablets stack 1 to 4 per map. Expedition Tablets do not drop in Runes of Aldur.",
    source: patchSource(),
  },
  {
    id: "delta-hotfix-055c",
    system: "Hotfix 0.5.5c (2026-09-18)",
    before: "Not covered by this guide.",
    now: "A hotfix landed on 2026-09-18. Its changes, including whether the Soul Core Limit is per character or per item type, have not been read against the notes here.",
    source: digestSource("Dated in the project handoff only. The contents of the hotfix were not checked, so treat any 0.5.5 figure in this guide as possibly superseded."),
  },
  {
    id: "delta-delirium",
    system: "Delirium scaling and fog",
    before: "Pack count scaled to 200% Deliriousness; Grand Mirror spread fog to 8 to 16 maps.",
    now: "Pack count caps at 100% Deliriousness (Monster Effectiveness and Rarity still scale to 200%). Grand Mirror spreads fog to exactly 10 maps. Recurring Nightmares gives +30% Deliriousness.",
    source: patchSource({
      verified: "unverified",
      note: "The pack-count cap and 10-map fog spread match the 0.5.5 patch notes already used in this guide. The Recurring Nightmares +30% figure is only in the endgame update spec.",
    }),
  },
  {
    id: "delta-azmeri",
    system: "Azmeri Spirits and Wisps",
    before: "Pandora's Box and The Deadliest Hunt released or chained Azmeri Spirits for near-infinite party loot.",
    now: "Spirit re-manifestation scales with Monster Empowerment (1% per 2%, split across spirits). Pandora's Box is +15% Strongbox Rarity; The Deadliest Hunt is +15% Unique drop chance on Rogue Exiles.",
    source: digestSource(SPEC_ONLY),
  },
  {
    id: "delta-wildwood",
    system: "Forbidden Rites and Viridian Wildwood",
    before: "Viridian Wildwood was a standalone Unique Map.",
    now: "The Unique Map is disabled. Rituals spawn in every map and drop Sacred Blooms, which add the Viridian Wildwood (Azmeri Wisp trails) to a cluster of nearby Atlas maps.",
    source: digestSource(SPEC_ONLY),
  },
  {
    id: "delta-trials",
    system: "Trial of Chaos and Trial of Sekhemas",
    before: "Trial of Chaos had to be finished in one sitting, with corrupted rare trash rewards and no Atlas compensation.",
    now: "Pause and resume between rooms, a reward chest after every room, rewards limited to Currency and Soul Cores, and one Inscribed Ultimatum chains up to 30 rooms. Both Trials get inherent area-level pack, rarity and Exceptional item bonuses.",
    source: digestSource(SPEC_ONLY),
  },
];

export const trialOfChaosRules: string[] = [
  "Pause or leave between any two rooms, and resume later.",
  "A reward chest spawns after every room.",
  "Completion rewards are Currency and Soul Cores only. 17 new Soul Cores were added; attribute-conversion cores went from 20% to 40%.",
  "One Inscribed Ultimatum chains Floors 10, 20 and 30, which is how you reach all three Trialmaster Fates: Deadly, Cowardly and Victorious.",
];

export const trialOfChaosModifiers: TrialModifier[] = [
  { name: "Lethal Rares", detail: "+30 to 100% Rare Monsters.", tier: "free" },
  { name: "Monster Resistances", detail: "+10 to 50% resistances; also helps Rakiata's Flow users.", tier: "free" },
  { name: "Unstoppable Monsters", detail: "Free for most builds.", tier: "free" },
  { name: "Shielded Monsters", detail: "Free for most builds.", tier: "free" },
  { name: "Blood Globules", detail: "Take the lowest tier.", tier: "free" },
  { name: "Stalking Shade", detail: "Tier 1 to 2 only; avoid it in Soul Core rooms.", tier: "free" },
  { name: "Chaotic / Toxic Monsters", detail: "Only if you are Chaos Inoculated or Chaos-capped.", tier: "free" },
  { name: "Damaged Defences", detail: "20 to 80% less Armour, Evasion and Energy Shield.", tier: "avoid" },
  { name: "Reduced Resistances", detail: "-15 to -45% Elemental Resistances and -5 to -15% maximum at Tier 3 to 5.", tier: "avoid" },
  { name: "Reduced Recovery", detail: "20 to 80% less recovery rate.", tier: "avoid" },
  { name: "Time Paradox", detail: "Buffs expire 50 to 200% faster.", tier: "avoid" },
];

export const trialOfChaosWagers: string[] = [
  "Wager of the Future early: doubles the stack size of every currency reward offered from then on.",
  "Wager of the Present late: doubles all pending currency rewards once Divines are pending.",
  "Never take Wager of Rarity or Wager of Rerolling while you hold valuable pending currency.",
];

export const essenceRules: string[] = [
  "Lesser, normal and greater Essences turn a Magic (2-mod) item into a Rare with one guaranteed mod.",
  "Perfect and Corrupted Essences (Hysteria, Delirium, Horror, Insanity, Abyss) replace an existing random modifier on a Rare item.",
  "A Rare holds at most 3 prefixes and 3 suffixes, and a Perfect Essence cannot be used if the item already has a modifier from the same family.",
  "A prefix Perfect Essence on a Rare with 3 full prefixes always removes one of those prefixes, so your suffixes are safe. The same holds for a suffix Perfect Essence and 3 full suffixes.",
  "If the side you are slamming is not full, add Omen of Sinistral Crystallisation (forces a prefix to be removed) or Omen of Dextral Crystallisation (forces a suffix).",
  "Vaal Orb Essence crystals that hold cheap Perfect Essences: they can upgrade to the expensive Corrupted ones (Horror, Hysteria).",
];

const ESSENCE_SOURCE = digestSource(SPEC_ONLY);

export const essences: EssenceEntry[] = [
  { id: "ess-horror", name: "Essence of Horror", slot: "Gloves, Boots", modType: "Suffix", effect: "60 to 100% increased effect of socketed items, which doubles the effect of socketed Runes and Soul Cores.", source: ESSENCE_SOURCE },
  { id: "ess-hysteria", name: "Essence of Hysteria", slot: "Boots, Quiver, Gloves", modType: "Prefix on Boots and Quiver, suffix on Gloves", effect: "30% Movement Speed on Boots, 43 to 50% Bow Skill Damage on Quivers, 25 to 29% Critical Damage Bonus on Gloves.", source: ESSENCE_SOURCE },
  { id: "ess-abyss", name: "Essence of the Abyss", slot: "Any equipment", modType: "Prefix or suffix", effect: "Replaces a modifier with Mark of the Abyssal Lord; the next Desecrated currency removes the mark and reveals higher-tier modifiers than the one replaced.", source: ESSENCE_SOURCE },
  { id: "ess-battle", name: "Essence of Battle", slot: "Martial weapons, Bows", modType: "Suffix (Perfect)", effect: "+4 Attack Skill Levels on 1H weapons and Bows, +6 on 2H weapons and Crossbows. The regular essence is a weak Accuracy prefix.", source: ESSENCE_SOURCE },
  { id: "ess-enhancement", name: "Essence of Enhancement", slot: "Amulet", modType: "Prefix (Perfect)", effect: "20 to 30% increased Global Defences, which scales Armour, Evasion and Energy Shield together.", source: ESSENCE_SOURCE },
  { id: "ess-body", name: "Essence of the Body", slot: "Body Armour", modType: "Prefix (Perfect)", effect: "8 to 10% increased maximum Life. Slam it on a Body Armour with 3 prefixes and finished suffixes.", source: ESSENCE_SOURCE },
  { id: "ess-ruin", name: "Essence of Ruin", slot: "Body Armour", modType: "Prefix (Perfect)", effect: "10 to 15% of Physical Damage taken as Chaos, useful for Chaos Inoculation builds.", source: ESSENCE_SOURCE },
  { id: "ess-sorcery", name: "Essence of Sorcery", slot: "Wand, Staff", modType: "Prefix (Perfect)", effect: "+3 to all Spell Skill Levels on a Wand, +5 on a Staff. Cannot be used on Foci.", source: ESSENCE_SOURCE },
];

const REGEX_SOURCE = digestSource(
  "Strings and groupings from the 0.5.5 endgame update spec, citing a Reddit soft-brick thread and the Lolcohol regex guide. Every Atlas term is checked against the tree data in tests."
);

/** In-game search bars take at most 50 characters, quotes included. */
export const REGEX_MAX_LENGTH = 50;

export const regexStrings: RegexEntry[] = [
  { id: "rx-brick-1", label: "Soft bricks, group 1 (hard avoid)", where: "atlas", regex: '"Hiveseeding|Fittest|Lost Architect|Rivalry"', source: REGEX_SOURCE },
  {
    id: "rx-brick-2",
    label: "Soft bricks, group 2 (bugged or situational)",
    where: "atlas",
    regex: '"Man Trap|Living Metal|Childhood|Transference"',
    note: "\"Transference\" also lights up Essence Transference, a different node.",
    source: REGEX_SOURCE,
  },
  { id: "rx-brick-3", label: "Soft bricks, group 3 (rippy boss scaling)", where: "atlas", regex: '"Your Leader|Hunt the Apex|Alliances|Worthy"', source: REGEX_SOURCE },
  { id: "rx-sustain", label: "Early sustain and tablet rush", where: "atlas", regex: '"waystone|tablet|effective"', source: REGEX_SOURCE },
  { id: "rx-multipliers", label: "Generic loot multipliers", where: "atlas", regex: '"rare monster|pack size|rarity|ex"', source: REGEX_SOURCE },
  { id: "rx-crossbow", label: "Crossbow, boots and flat attack filter", where: "stash", regex: '"!quiver" "sbo|ent sp|to att"', source: REGEX_SOURCE },
  { id: "rx-boots", label: "Early mapping boots, life and resistance gear", where: "stash", regex: '"ent sp|resist|maximum life"', source: REGEX_SOURCE },
];
