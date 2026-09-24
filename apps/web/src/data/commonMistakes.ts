import type { CommonMistake } from "@/lib/types";
import {
  atlasSource,
  digestSource,
  strategySource,
  video05Source,
  videoSource,
} from "./sourceMeta";

export const commonMistakes: CommonMistake[] = [
  {
    id: "m-defenses-before-tiers",
    title: "Pushing map tiers before defenses are ready",
    description:
      "Endgame is a survival check, not just a DPS check — gear resistances and life before chasing higher Waystone tiers.",
    appliesToStage: ["roadmap", "dashboard"],
    source: strategySource(),
  },
  {
    id: "m-spread-atlas-points",
    title: "Spreading Atlas points across multiple mechanics",
    description:
      "Payoff nodes sit deep in each sub-tree (9-12 nodes in). Half-investing two mechanics nets ~60% of one full investment, not 200% — specialize in one at a time.",
    appliesToStage: ["roadmap", "atlas"],
    source: strategySource(),
  },
  {
    id: "m-ignore-waystone-sustain",
    title: "Ignoring Waystone sustain",
    description:
      "Spending every good Waystone without securing sustain nodes/backups stalls your progression entirely.",
    appliesToStage: ["roadmap"],
    source: strategySource(),
  },
  {
    id: "m-rush-t15",
    title: "Rushing T15 when T11 already gives ~95% of loot value",
    description:
      "T15 rarely improves on T11 (item level 75) rolls, which are already high-weight — the extra risk isn't worth it until you're geared. Run the highest tier you clear at a decent pace, not the highest you survive; if a map takes 50–80% longer, drop down.",
    appliesToStage: ["roadmap"],
    source: video05Source(["VSeDfybR3Cc@09:07", "uMHfOL8sT6I@03:03"]),
  },
  {
    id: "m-skip-fortress",
    title: "Skipping Fortress progression",
    description:
      "The Precursor Fortress is your Atlas-point engine, not a side mechanic — don't neglect it in favor of farming loops.",
    appliesToStage: ["roadmap", "atlas"],
    source: atlasSource(),
  },
  {
    id: "m-master-swap",
    title: "Not swapping Masters per activity",
    description:
      "Running empty maps without the right Master (Jado/Doryani/Hilda) for the activity wastes monster-scaling and reward nodes.",
    appliesToStage: ["dashboard"],
    source: strategySource(),
  },
  {
    id: "m-burn-tablets-early",
    title: "Burning good tablets before towers/Atlas are ready",
    description:
      "Mixing tablet types across mechanics in one session, or spending high-roll tablets before your setup can use them, wastes their value.",
    appliesToStage: ["atlas", "dashboard"],
    source: strategySource(),
  },
  {
    id: "m-overstack-rarity",
    title: "Over-stacking rarity at the cost of damage/defense",
    description:
      "Also applies to over-Runeforging high item-level gear — on ilvl 56+ gear, Runic Ward conversion is a trade against your existing defenses, not a pure freebie.",
    appliesToStage: ["dashboard"],
    source: strategySource(),
  },
  {
    id: "m-corrupt-last-map",
    title: "Corrupting your last good T15",
    description:
      "Only corrupt surplus Waystones — Vaal Orb corruption has under a 5% success chance to reach T16 and can downgrade to T14.",
    appliesToStage: ["dashboard"],
    source: strategySource(),
  },
  {
    id: "m-difficulty-nodes",
    title: "Taking multi-choice Atlas nodes that raise difficulty beyond your build",
    description:
      "Monster Effectiveness nodes scale all non-deterministic drops but also make monsters stronger — skip them entirely if your build can't handle the difficulty jump.",
    appliesToStage: ["atlas"],
    source: atlasSource(),
  },
  {
    id: "m-golden-rule-tablets-while-questing",
    title: "Running a mechanic's own tablets while questing it",
    description:
      "Tablets add more of the mechanic into the map, which slows down finishing that mechanic's quest and killing its boss. Applies to Abyss, Breach, and Ritual alike — quest first, juice after.",
    appliesToStage: ["atlas", "roadmap"],
    relatedMechanics: ["abyss", "breach", "ritual"],
    source: atlasSource(),
  },
  {
    id: "m-atlas-trap-nodes",
    title: "Taking Atlas trap nodes (no respec)",
    description:
      "Atlas points can't be refunded. Skip Man Trap (buggy Rogue Exile spawns outside the Essence), Survival of the Fittest if you'll farm Abyss (it merges rares, and Abyss drops one Omen per rare), and the hive-seeded Breach node unless you farm hives. The three small gold-found nodes are optional to path around. Full list on the Atlas page.",
    appliesToStage: ["atlas", "roadmap"],
    relatedMechanics: ["abyss", "breach"],
    source: videoSource(["uMHfOL8sT6I@07:37", "uMHfOL8sT6I@08:23", "5Vp_3gUFbwI@09:12"]),
  },
  {
    id: "m-clearing-maps-pre-atlas",
    title: "Full-clearing maps before the Atlas is unlocked",
    description:
      "Mechanics are weak without Atlas points. Boss-rush every map (Essences and Shrines only) until the second Arbiter of Divinity kill unlocks the full tree.",
    appliesToStage: ["roadmap"],
    source: videoSource(["5Vp_3gUFbwI@01:31", "uMHfOL8sT6I@04:35"]),
  },
  {
    id: "m-clearing-fortress-nodes",
    title: "Running individual Fortress nodes",
    description:
      "Only path to quest objectives. The second (non-quest) Arbiter of Divinity kill completes the whole Fortress in 0.5.5, so every extra Fortress map is wasted time.",
    appliesToStage: ["roadmap", "atlas"],
    source: video05Source(["jOU2zNgLxJ0@02:15", "VSeDfybR3Cc@05:03"]),
  },
  {
    id: "m-quest-divinity-expectation",
    title: "Expecting the first Arbiter of Divinity kill to unlock the Atlas",
    description:
      "The quest kill doesn't unlock your full tree — players stop there and assume it's bugged. Find one Matriarch + one Patriarch Hall outside the Fortress, build a non-quest Origin Core and kill it again.",
    appliesToStage: ["roadmap", "atlas"],
    source: videoSource(["uMHfOL8sT6I@05:20", "5Vp_3gUFbwI@07:39"]),
  },
  {
    id: "m-boss-before-mechanic",
    title: "Killing the boss before finishing a mechanic point map",
    description:
      "On league-mechanic Atlas-point maps, finish the mechanic before entering the boss arena (the checkpoint turns orange) — the point can fail to award otherwise.",
    appliesToStage: ["roadmap"],
    source: video05Source(["zMFBAr1a6SA@14:11", "zMFBAr1a6SA@16:14"]),
  },
  {
    id: "m-lineage-nodes-late",
    title: "Running anomaly maps before taking the Lineage Support nodes",
    description:
      "Allocate the anomaly-map Lineage Support drop nodes before any Jado anomaly map — Lineage gems are expensive and the nodes can double the drop.",
    appliesToStage: ["atlas", "roadmap"],
    source: video05Source(["VSeDfybR3Cc@21:17", "lsu7-ITJe_M@17:08"]),
  },
  {
    id: "m-alch-low-tiers",
    title: "Juicing Waystones while you're still unlocking the Atlas",
    description:
      "You're boss-rushing, so extra mods buy little loot and cost revives. Run Magic on normal nodes and Rare only on Powerful Map Boss nodes; alch red maps only when you're short on sustain.",
    appliesToStage: ["roadmap"],
    source: videoSource(["uMHfOL8sT6I@03:49", "5Vp_3gUFbwI@02:18"]),
  },
  {
    id: "m-ritual-tablets-during-bodach-parts",
    title: "Running Ritual tablets during the Bodach body-part maps",
    description:
      "While collecting the 5 body parts for The Bodach, run the chosen maps without Ritual tablets — they can get in the way of the quest drop.",
    appliesToStage: ["roadmap"],
    relatedMechanics: ["ritual"],
    source: digestSource("Only the web digest says this; no creator video covers it."),
  },
];
