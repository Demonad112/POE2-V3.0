import type { AtlasCluster, MemoryFork } from "@/lib/types";
import {
  atlasSource,
  patchSource,
  strategySource,
  video05Source,
} from "./sourceMeta";

/**
 * `order` is the recommended allocation sequence within a cluster's `group`,
 * NOT a spatial/pixel position — no real node-graph coordinates exist in the
 * source material (the Mobalytics interactive tree-planner pages this guide
 * draws on didn't extract as structured data, only their written notes did).
 */
export const atlasClusters: AtlasCluster[] = [
  // --- Main-path sequencing: pre-Arbiter of Ash sustain cluster ---
  {
    id: "cluster-trapped-subordinate",
    treeNodes: ["Trapped Subordinate"],
    name: "Trapped Subordinate",
    order: 1,
    group: "early-progression",
    description: "First node in the pre-Ash sustain/tablet-unlock block.",
    source: atlasSource(),
  },
  {
    id: "cluster-pathkeepers",
    treeNodes: ["Pathkeepers"],
    name: "Pathkeepers",
    order: 2,
    group: "early-progression",
    description: "+15% Waystone quantity — core sustain node.",
    source: atlasSource(),
  },
  {
    id: "cluster-eons-of-domination",
    treeNodes: ["Eons of Domination"],
    name: "Eons of Domination",
    order: 3,
    group: "early-progression",
    description:
      "Unlocks Overseer Tablets — slot immediately on any map node without a powerful boss to force Waystone-tier progression.",
    source: atlasSource(),
  },
  {
    id: "cluster-valuable-paths",
    treeNodes: ["Valuable Paths"],
    name: "Valuable Paths",
    order: 4,
    group: "early-progression",
    description: "Part of the rare-monster/sustain cluster.",
    source: atlasSource(),
  },
  {
    id: "cluster-chosen-path-essences",
    treeNodes: ["The Chosen Path"],
    name: "The Chosen Path: Essences",
    order: 5,
    group: "early-progression",
    description: "Essence-focused sustain node.",
    source: atlasSource(),
  },
  {
    id: "cluster-journey-ahead-effectiveness",
    treeNodes: ["The Journey Ahead"],
    name: "The Journey Ahead: Effectiveness",
    order: 6,
    group: "early-progression",
    description:
      "Monster Effectiveness node — scales all non-deterministic drops (currency, items, Waystones) but makes monsters stronger. Take it by default unless your character can't handle the difficulty jump.",
    killGated: false,
    source: atlasSource(),
  },
  {
    id: "cluster-archaeological-interest",
    treeNodes: ["Archaeological Interest"],
    name: "Archaeological Interest",
    order: 7,
    group: "early-progression",
    description: "Part of the rare-monster/sustain cluster.",
    source: atlasSource(),
  },
  {
    id: "cluster-expanding-hordes",
    treeNodes: ["Expanding Hordes"],
    name: "Expanding Hordes",
    order: 8,
    group: "early-progression",
    description: "Part of the rare-monster/sustain cluster.",
    source: atlasSource(),
  },
  {
    id: "cluster-atop-the-world",
    treeNodes: ["Atop the World"],
    name: "Atop the World",
    order: 9,
    group: "early-progression",
    description:
      "Unlocks generic Precursor Tablet drops while maxing Waystone drop chance. Last node before killing Arbiter of Ash.",
    source: atlasSource(),
  },

  // --- Main-path sequencing: post-Arbiter of Divinity, pre-memory-fork ---
  {
    id: "cluster-reverse-transcription",
    treeNodes: ["Reverse Transcription"],
    name: "Reverse Transcription",
    order: 10,
    group: "early-progression",
    description: "First node allocated after the first Arbiter of Divinity kill.",
    source: atlasSource(),
  },
  {
    id: "cluster-rogue-exile",
    treeNodes: ["Competing Explorers", "Competitive Archaeology"],
    name: "Competing Explorers / Competitive Archaeology (Rogue Exile cluster)",
    order: 11,
    group: "early-progression",
    description: "Rogue Exile cluster, pathed toward corrupted-zone passives.",
    source: atlasSource(),
  },
  {
    id: "cluster-essence-corrupted-zone",
    name: "Essence nodes → corrupted-zone passives",
    order: 12,
    group: "early-progression",
    description: "Essence path into corrupted-zone passives.",
    source: atlasSource(),
  },
  {
    id: "cluster-magic-monster-cleansed-area",
    name: "Magic-monster path → cleansed-area passives",
    order: 13,
    group: "early-progression",
    description: "Magic-monster path into cleansed-area passives.",
    source: atlasSource(),
  },
  {
    id: "cluster-mountain-mastery-tablets",
    treeNodes: ["Mountain Mastery"],
    name: "Mountain Mastery: Tablets",
    order: 14,
    group: "early-progression",
    description:
      "Final node before the three memory forks — scales tablet modifiers broadly.",
    source: atlasSource(),
  },
  {
    id: "cluster-fracturing-orbs",
    treeNodes: ["Hidden Scars", "From Distances Untold"],
    name: "Hidden Scars + From Distances Untold (Fracturing Orbs)",
    order: 15,
    group: "early-progression",
    description:
      "Chance for Fracturing Orbs — essential, valuable crafting currency. Take both as you leave the Citadel area.",
    source: video05Source(["lsu7-ITJe_M@16:08", "jOU2zNgLxJ0@12:12"]),
  },
  {
    id: "cluster-lineage-support-nodes",
    name: "Anomaly-map Lineage Support drop nodes",
    order: 16,
    group: "early-progression",
    description:
      "Chance for extra Lineage Support gems from anomaly maps. Allocate before running any anomaly map or Jado quest.",
    source: video05Source(["VSeDfybR3Cc@21:17", "lsu7-ITJe_M@17:08"]),
  },
  {
    id: "cluster-propagating-secrets",
    treeNodes: ["Propagating Secrets"],
    name: "Propagating Secrets (tablet quantity)",
    order: 17,
    group: "early-progression",
    description: "Increases tablet drops — take it alongside Reverse Transcription.",
    source: video05Source(["jOU2zNgLxJ0@11:27"], {
      note: "Node name and effect (8% more Tablets per Tablet on the map) confirmed in the Atlas tree data.",
    }),
  },

  // --- General / late-game clusters ---
  {
    id: "cluster-doryani-exploration",
    name: "Doryani's exploration branch",
    order: 1,
    group: "general",
    description:
      "Stitch the Flesh (+1 revive), Hidden Patterns, Remnants of the Greatness, then Map Irradiation or Volatile Connection. Path outward from a Fortress wall tower in one direction only, clearing corrupted nexuses for Doryani points, to find a Matriarch/Patriarch Hall pair outside the walls for the non-quest Origin Core.",
    source: video05Source(["VSeDfybR3Cc@22:18", "uMHfOL8sT6I@10:40"]),
  },
  {
    id: "cluster-generic-quantity-rarity",
    name: "Generic quantity/rarity/pack-size",
    order: 2,
    group: "general",
    description:
      "Remaining points once the Precursor Fortress is complete go here before finishing out mechanic sub-trees. Fubgun: search \"rare\" and \"tablet\" in the tree and take them all. Leave the city/middle-region nodes for last if you farm outside cities.",
    source: video05Source(["-R5KjDJQu9w@09:04", "-R5KjDJQu9w@08:19", "VSeDfybR3Cc@24:20"]),
  },
  {
    id: "cluster-closeout-sequencing",
    name: "Mechanic close-out order",
    order: 3,
    group: "general",
    description:
      "Recommended order: Ritual → Vaal Temple → Delirium (hardest last). Past ~120 total points, allocation order stops mattering much.",
    source: atlasSource(),
  },

  {
    id: "cluster-undergeared-opener",
    name: "Alternative opener for undergeared characters (Scorpius)",
    order: 4,
    group: "general",
    description:
      "Shrine cluster → magic-monster circle → Eons of Contamination (irradiated tablets, T6+/area 70+) → No Simple Battles → Valuable Paths → Specialized Seeker → Chosen Path (Rogue Exiles) → Journey Ahead → Archaeological Interest. Stuck under T10? Take the middle circle and star cluster instead of going north.",
    source: video05Source(["jOU2zNgLxJ0@08:22", "jOU2zNgLxJ0@10:07"]),
  },

  // --- Mechanic sub-trees: Breach (Genesis Tree / Keepers of the Flame) ---
  {
    id: "cluster-breach-banded-fruit",
    treeNodes: ["Breeding Program"],
    name: "Breeding Program: Banded Fruit",
    order: 1,
    group: "mechanic-subtree",
    mechanic: "breach",
    description: "First Breach sub-tree priority.",
    source: atlasSource(),
  },
  {
    id: "cluster-breach-diverse-control",
    treeNodes: ["Diverse Control"],
    name: "Diverse Control",
    order: 2,
    group: "mechanic-subtree",
    mechanic: "breach",
    description: "Second Breach sub-tree priority.",
    source: atlasSource(),
  },
  {
    id: "cluster-breach-monster-count",
    name: "Breach monster-count nodes",
    order: 3,
    group: "mechanic-subtree",
    mechanic: "breach",
    description: "Increases monster count in breach encounters for more Hiveblood.",
    source: atlasSource(),
  },
  {
    id: "cluster-breach-sole-purpose",
    treeNodes: ["Sole Purpose"],
    name: "Sole Purpose: Destruction",
    order: 4,
    group: "mechanic-subtree",
    mechanic: "breach",
    description: "More Ailith abilities that spawn extra monsters.",
    source: atlasSource(),
  },

  // --- Mechanic sub-trees: Abyss ---
  {
    id: "cluster-abyss-shadow-of-undeath",
    treeNodes: ["Shadow of Undeath"],
    name: "Shadow of Undeath",
    order: 1,
    group: "mechanic-subtree",
    mechanic: "abyss",
    description: "Core Abyss sub-tree node.",
    source: strategySource(),
  },
  {
    id: "cluster-abyss-lightless-legions",
    name: "Lightless Legions",
    order: 2,
    group: "mechanic-subtree",
    mechanic: "abyss",
    description: "Core Abyss sub-tree node.",
    source: strategySource(),
  },
  {
    id: "cluster-abyss-rogue-exile",
    name: "Rogue Exile nodes (Abyss)",
    order: 3,
    group: "mechanic-subtree",
    mechanic: "abyss",
    description: "Rogue Exile nodes paired with Abyss tablets.",
    source: strategySource(),
  },
  {
    id: "cluster-abyss-balance-of-power",
    treeNodes: ["Balance of Power"],
    name: "Balance of Power: Ulaman",
    order: 4,
    group: "mechanic-subtree",
    mechanic: "abyss",
    description:
      "Prefer over From Below/Sprawling Rupture while questing Abyss — avoid inflating encounter size/duration until the quest is done.",
    source: atlasSource(),
  },

  // --- Mechanic sub-trees: Delirium (two-part quest) ---
  {
    id: "cluster-delirium-part1-willow",
    name: "Part 1: Withered Willow — amulet anointing",
    order: 1,
    group: "mechanic-subtree",
    mechanic: "delirium",
    description:
      "Do at T11, mid-progression. Kill 5 map bosses with delirium mirror fog active to unlock amulet anointing.",
    source: atlasSource(),
  },
  {
    id: "cluster-delirium-part1-emotions",
    treeNodes: ["I know your childhood fears..."],
    name: "Part 1: \"I know your childhood fears...\"",
    order: 2,
    group: "mechanic-subtree",
    mechanic: "delirium",
    description:
      "Clear the first 4 passive-point maps for more liquid emotion drops, then pass through mirrors incidentally until you have enough for a decent anoint.",
    source: atlasSource(),
  },
  {
    id: "cluster-delirium-part2-simulacrum",
    name: "Part 2: Grand Mirror → Simulacrum → Tangmazu",
    order: 3,
    group: "mechanic-subtree",
    mechanic: "delirium",
    description:
      "Save for last — hardest mechanic. Kill the map boss's mirrored copy alongside the original, spread fog to spawn a Simulacrum (7-stage fight), then bring the Raven's Reflection key to the Withered Willow to fight Tangmazu for the remaining tree points.",
    source: atlasSource(),
  },

  // --- Mechanic sub-trees: Ritual ---
  {
    id: "cluster-ritual-subtree",
    name: "Ritual sub-tree — Tribute deferral",
    order: 1,
    group: "mechanic-subtree",
    mechanic: "ritual",
    description:
      "Defer Tribute to fish Omens/chase uniques. 0.5.5 fixed Invigorated Sacrifices granting far more Tribute than intended, so Tribute totals from pre-0.5.5 guides may run high.",
    source: strategySource({
      note: "Invigorated Sacrifices fix is from the 0.5.5 patch notes.",
    }),
  },
  {
    id: "cluster-ritual-royal-lenience",
    treeNodes: ["Royal Lenience"],
    name: "Royal Lenience (notable, new in 0.5.5)",
    order: 5,
    group: "mechanic-subtree",
    mechanic: "ritual",
    description:
      "Tribute already offered to the King can be used to Defer items; Deferring this way costs 500% more Offered Tribute. Lets Tribute you gave up still buy a deferral.",
    source: patchSource(),
  },
  {
    id: "cluster-ritual-tablet-reroll",
    name: "Tablet mod: rerolling favours costs 20-30% reduced tribute",
    order: 2,
    group: "mechanic-subtree",
    mechanic: "ritual",
    description: "Mandatory tablet modifier — aim for 28-30% if running only one.",
    source: atlasSource(),
  },
  {
    id: "cluster-ritual-tablet-sacrifice",
    name: "Tablet mod: sacrificed monsters grant 18-30% increased tribute",
    order: 3,
    group: "mechanic-subtree",
    mechanic: "ritual",
    description: "Secondary tablet modifier priority.",
    source: atlasSource(),
  },
  {
    id: "cluster-ritual-tablet-omens",
    name: "Tablet mod: favours 35-70% increased chance to be Omens",
    order: 4,
    group: "mechanic-subtree",
    mechanic: "ritual",
    description: "Tablet modifier priority for Omen-focused setups.",
    source: atlasSource(),
  },

  {
    id: "cluster-ritual-quest-passives",
    treeNodes: ["Reborn in Shadow", "From the Mists", "Invigorated Sacrifices"],
    name: "Ritual quest passives: Reborn / Shadow from the Mists, Invigorated Sacrifices, Attrition",
    order: 6,
    group: "mechanic-subtree",
    mechanic: "ritual",
    description:
      "Passives unlocked along the King in the Mists → Bodach chain.",
    source: video05Source(["VSeDfybR3Cc@25:21"], {
      verified: "unverified",
      note: "Reborn in Shadow, From the Mists and Invigorated Sacrifices are confirmed in the Atlas tree data (the captions heard them as \"Reborn / Shadow from the Mists\"). Attrition isn't in the tree under that name.",
    }),
  },

  // --- Mechanic sub-trees: Expedition (flagged version conflict) ---
  {
    id: "cluster-expedition-atlas-tree",
    name: "Expedition Atlas Passive Tree",
    order: 1,
    group: "mechanic-subtree",
    mechanic: "expedition",
    description:
      "0.5.4 'Grand Expedition' patch notes describe a dedicated Expedition Atlas tree (e.g. 'Feeling Lucky?' for Liquid Verisium), and Lazy Exile (0.5.5) says the Grand Expedition quest line awards points; only a pre-0.5.4 guide says there's no tree. Since 0.5.5 Expedition is a core Atlas mechanic in every league, including Standard; Expedition Tablets drop in Standard and Forbidden Rites but not in Runes of Aldur.",
    source: atlasSource({
      verified: "conflicting",
      note: "Asmodeus's guide (pre-0.5.4) says Expedition has no Atlas tree; the 0.5.4 'Grand Expedition' patch notes and Lazy Exile (5Vp_3gUFbwI@10:44, 0.5.5) say it has points. Leaning 'has a tree'.",
    }),
  },
];

export const memoryForks: MemoryFork[] = [
  {
    id: "fork-top-left",
    treeNodes: ["Risk and Reward", "Enigmatic Intensification", "Memories of the Vaal", "Memories of the Maraketh"],
    branch: "top-left",
    title: "Top-Left Fork",
    nodes: [
      "Risk and Reward",
      "Enigmatic Intensification",
      "Memories of the Vaal/Maraketh",
    ],
    description:
      "One of three top-of-tree memory forks unlocked after the first Arbiter of Divinity kill. These scale your Waystone and tablet modifiers and are some of the highest-impact points in the whole tree.",
    source: atlasSource(),
  },
  {
    id: "fork-top-right",
    treeNodes: ["Controlled Climates", "Hard-Won Treasures", "Memories of the Ezomytes", "Memories of the Karui"],
    branch: "top-right",
    title: "Top-Right Fork",
    nodes: [
      "Controlled Climates",
      "Hard-Won Treasures",
      "Memories of the Ezomytes/Karui",
    ],
    description:
      "One of three top-of-tree memory forks unlocked after the first Arbiter of Divinity kill.",
    source: atlasSource(),
  },
  {
    id: "fork-top",
    treeNodes: ["Desert Mastery", "Curiously Durable Stone", "Partial Translation"],
    branch: "top",
    title: "Top Fork",
    nodes: [
      "Desert Mastery: Effectiveness",
      "Curiously Durable Stone",
      "Partial Translation",
    ],
    description:
      "One of three top-of-tree memory forks unlocked after the first Arbiter of Divinity kill.",
    source: atlasSource(),
  },
];
