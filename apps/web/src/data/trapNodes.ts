import type { AtlasTrapNode } from "@/lib/types";
import { digestSource, videoSource } from "./sourceMeta";

/**
 * Atlas nodes that hurt more than they help. Atlas points can't be refunded,
 * so this list is shown before the allocation flow. Video-sourced entries come
 * first; web-digest-only entries are flagged unverified.
 */
export const atlasTrapNodes: AtlasTrapNode[] = [
  {
    id: "trap-man-trap",
    treeNodes: ["Man Trap"],
    node: "Man Trap",
    affects: "Essences",
    problem:
      "10% chance for Essence monsters to become Rogue Exiles. Still buggy: the Exiles can spawn away from the Essence and you have to walk back for them.",
    avoidIf: "Always, until it's fixed",
    severity: "avoid",
    group: 2,
    source: videoSource(["uMHfOL8sT6I@07:37", "5Vp_3gUFbwI@09:12"]),
  },
  {
    id: "trap-survival-of-the-fittest",
    treeNodes: ["Survival of the Fittest"],
    node: "Survival of the Fittest",
    affects: "Desert rares / Abyss",
    problem:
      "Desert rare packs that would get extra rares become one double-effectiveness rare instead. Abyss drops at most one Omen per rare, so fewer rares means fewer Omens, and Grand Expeditions lose rare loot too.",
    avoidIf: "Always on the Atlas rush; it also cuts Omen of Light and Grand Expedition rare loot",
    severity: "avoid",
    group: 1,
    source: videoSource(["uMHfOL8sT6I@08:23", "5Vp_3gUFbwI@09:12"]),
  },
  {
    id: "trap-reactive-hive-breach",
    treeNodes: ["Reactive Hiveseeding"],
    node: "Reactive Hiveseeding",
    affects: "Breach",
    problem:
      "10% chance for a completed Breach to add a Breach Hive to nearby maps. That blocks Unstable Breaches and wastes Breach Tablet charges.",
    avoidIf: "Always, unless you deliberately farm hives",
    severity: "avoid",
    group: 1,
    source: videoSource(["uMHfOL8sT6I@09:09"], {
      note: "Node name confirmed against the Atlas tree data; the Unstable Breach and tablet-charge detail is from the 0.5.5 soft-brick thread.",
    }),
  },
  {
    id: "trap-gold-found",
    node: "Small 'increased gold found' nodes (×3)",
    affects: "Currency drops",
    problem:
      "May slightly reduce raw currency (gold conversion) — unproven and small if real. There's no downside to pathing around them.",
    avoidIf: "Optional — path around them if convenient",
    severity: "optional",
    group: 2,
    source: videoSource(["uMHfOL8sT6I@09:55", "5Vp_3gUFbwI@09:12"]),
  },
  {
    id: "trap-lost-architect",
    treeNodes: ["The Lost Architect"],
    node: "The Lost Architect",
    affects: "Vaal Temple",
    problem:
      "Adds Zantipi's Medallion to the Temple medallion pool, diluting the drops you need for Snaking or hybrid layouts.",
    avoidIf: "You run a Snaking or hybrid Vaal Temple layout",
    severity: "avoid",
    group: 1,
    source: digestSource("Only the web digest (a Reddit 'soft brick nodes' thread) lists this; no creator video covers it. The node and its effect exist in the Atlas tree data — calling it a trap is the digest's judgement."),
  },
  {
    id: "trap-escalating-rivalry",
    treeNodes: ["Escalating Rivalry"],
    node: "Escalating Rivalry",
    affects: "Rogue Exiles",
    problem:
      "Rogue Exiles get a 5% chance to flee to an adjacent map, taking the Azmeri Wisps and Abyss loot you collected with them.",
    avoidIf: "You rely on Rogue Exile or Azmeri Wisp loot",
    severity: "avoid",
    group: 1,
    source: digestSource("Only the web digest lists this; no creator video covers it. The node and its effect exist in the Atlas tree data — calling it a trap is the digest's judgement."),
  },
  {
    id: "trap-hunt-the-apex",
    treeNodes: ["Hunt the Apex"],
    node: "Hunt the Apex",
    affects: "Azmeri Spirits / map bosses",
    problem:
      "Azmeri Spirits can possess map bosses, making high-tier bosses much deadlier.",
    avoidIf: "Your build struggles with T14+ bosses",
    severity: "situational",
    group: 3,
    source: digestSource("Only the web digest lists this; no creator video covers it. The node and its effect exist in the Atlas tree data — calling it a trap is the digest's judgement."),
  },
  {
    id: "trap-bring-me-your-leader",
    treeNodes: ["Bring Me Your Leader"],
    node: "Bring Me Your Leader",
    affects: "Ritual",
    problem:
      "Chance for Ritual circles to spawn a Citadel boss inside the circle — dangerous for most builds.",
    avoidIf: "Your build can't handle Citadel bosses in a confined space",
    severity: "situational",
    group: 3,
    source: digestSource("Only the web digest lists this; no creator video covers it. The node and its effect exist in the Atlas tree data — calling it a trap is the digest's judgement."),
  },
  {
    id: "trap-armaments-of-evil",
    treeNodes: ["Armaments of Evil"],
    node: "Armaments of Evil",
    affects: "Abyss",
    problem:
      "Forces a random Desecrated modifier onto Tier 5 Rare drops, overwriting a natural high-tier affix on 6-mod items.",
    avoidIf: "You sell or craft Abyss gear drops",
    severity: "situational",
    group: 2,
    source: digestSource("Only the web digest lists this; no creator video covers it. The node and its effect exist in the Atlas tree data — calling it a trap is the digest's judgement."),
  },
  {
    id: "trap-living-metal",
    treeNodes: ["Living Metal"],
    node: "Living Metal",
    affects: "Azmeri Spirits",
    problem:
      "Spirits possess Strongboxes instead of monsters, pulling them away from packs and bosses.",
    avoidIf: "You want Spirits on monsters",
    severity: "situational",
    group: 2,
    source: digestSource("Only the web digest lists this; no creator video covers it. The node and its effect exist in the Atlas tree data — calling it a trap is the digest's judgement."),
  },

  {
    id: "trap-mysterious-transference",
    treeNodes: ["Mysterious Transference"],
    node: "Mysterious Transference",
    affects: "Swamp Essences",
    problem:
      "25% chance for a slain Essence monster's mods to transfer to a Unique boss. The transfer can carry corrupted Zarokh Temporal Orb and Hourglass mechanics onto Ritual bosses.",
    avoidIf: "Always on the Atlas rush; a map-brick risk",
    severity: "avoid",
    group: 2,
    source: digestSource("Only the 0.5.5 endgame update spec (citing a Reddit soft-brick thread) lists this; no creator video covers it. The node exists in the Atlas tree data — calling it a trap is the thread's judgement."),
  },
  {
    id: "trap-childhood-fears",
    treeNodes: ["I know your childhood fears..."],
    node: "I know your childhood fears...",
    affects: "Delirium",
    problem:
      "+25% Liquid Emotions with 20% converted to Ancient Liquid Emotions (fixed from a 50% bug in 0.5.5). It still dilutes the standard emotion pool for Simulacrum farmers.",
    avoidIf: "You farm the Simulacrum",
    severity: "situational",
    group: 2,
    source: digestSource("Only the 0.5.5 endgame update spec lists this; no creator video covers it. The node exists in the Atlas tree data."),
  },
  {
    id: "trap-uncommon-alliances",
    treeNodes: ["Uncommon Alliances"],
    node: "Uncommon Alliances",
    affects: "Rogue Exiles",
    problem: "Pairs Rogue Exiles, which scales their danger well beyond a single exile.",
    avoidIf: "Your build struggles with paired exiles",
    severity: "situational",
    group: 3,
    source: digestSource("Only the 0.5.5 endgame update spec lists this; no creator video covers it. The node exists in the Atlas tree data."),
  },
  {
    id: "trap-worthy-hunter",
    treeNodes: ["Worthy Hunter"],
    node: "Worthy Hunter",
    affects: "Azmeri Spirits",
    problem: "Adds Fox Spirits, another source of extremely rippy monster scaling.",
    avoidIf: "Your build struggles with T14+ monster scaling",
    severity: "situational",
    group: 3,
    source: digestSource("Only the 0.5.5 endgame update spec lists this; no creator video covers it. The node exists in the Atlas tree data."),
  },
];
