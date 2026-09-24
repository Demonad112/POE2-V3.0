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
    node: "Man Trap",
    affects: "Essences",
    problem:
      "10% chance for Essence monsters to become Rogue Exiles. Still buggy: the Exiles can spawn away from the Essence and you have to walk back for them.",
    avoidIf: "Always, until it's fixed",
    severity: "avoid",
    source: videoSource(["uMHfOL8sT6I@07:37", "5Vp_3gUFbwI@09:12"]),
  },
  {
    id: "trap-survival-of-the-fittest",
    node: "Survival of the Fittest",
    affects: "Desert rares / Abyss",
    problem:
      "Desert rare packs that would get extra rares become one double-effectiveness rare instead. Abyss drops at most one Omen per rare, so fewer rares means fewer Omens.",
    avoidIf: "You farm Abyss / Omen of Light (fine for other farms)",
    severity: "situational",
    source: videoSource(["uMHfOL8sT6I@08:23", "5Vp_3gUFbwI@09:12"]),
  },
  {
    id: "trap-reactive-hive-breach",
    node: "Reactive Hive-seeded Breach node",
    affects: "Breach",
    problem:
      "10% chance for completed Breaches to add a hive-seeded map. Hives are a waste of time for most farms.",
    avoidIf: "You don't farm hives",
    severity: "situational",
    source: videoSource(["uMHfOL8sT6I@09:09"], {
      note: "Exact node name is approximate (auto-captions).",
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
    source: videoSource(["uMHfOL8sT6I@09:55", "5Vp_3gUFbwI@09:12"]),
  },
  {
    id: "trap-lost-architect",
    node: "The Lost Architect",
    affects: "Vaal Temple",
    problem:
      "Adds another medallion to the Temple medallion pool, diluting the drops you need for straight temple routing.",
    avoidIf: "You run the Vaal Temple",
    severity: "situational",
    source: digestSource("Only the web digest (a Reddit 'soft brick nodes' thread) lists this; no creator video covers it."),
  },
  {
    id: "trap-escalating-rivalry",
    node: "Escalating Rivalry",
    affects: "Rogue Exiles",
    problem:
      "Rogue Exiles can flee to an adjacent map, taking whatever they'd accumulated with them.",
    avoidIf: "You rely on Rogue Exile loot",
    severity: "situational",
    source: digestSource("Only the web digest lists this; no creator video covers it."),
  },
  {
    id: "trap-hunt-the-apex",
    node: "Hunt the Apex",
    affects: "Azmeri Spirits / map bosses",
    problem:
      "Azmeri Spirits can possess map bosses, making high-tier bosses much deadlier.",
    avoidIf: "Your build struggles with T14+ bosses",
    severity: "situational",
    source: digestSource("Only the web digest lists this; no creator video covers it."),
  },
  {
    id: "trap-bring-me-your-leader",
    node: "Bring Me Your Leader",
    affects: "Ritual",
    problem:
      "Chance for Ritual circles to spawn a Citadel boss inside the circle — dangerous for most builds.",
    avoidIf: "Your build can't handle Citadel bosses in a confined space",
    severity: "situational",
    source: digestSource("Only the web digest lists this; no creator video covers it."),
  },
  {
    id: "trap-armaments-of-evil",
    node: "Armaments of Evil",
    affects: "Abyss",
    problem:
      "Rare equipment from Abyssal monsters drops with Desecrated modifiers, which limits normal crafting on it.",
    avoidIf: "You sell or craft Abyss gear drops",
    severity: "situational",
    source: digestSource("Only the web digest lists this; no creator video covers it."),
  },
  {
    id: "trap-living-metal",
    node: "Living Metal",
    affects: "Azmeri Spirits",
    problem:
      "Spirits possess Strongboxes instead of monsters, pulling them away from packs and bosses.",
    avoidIf: "You want Spirits on monsters",
    severity: "situational",
    source: digestSource("Only the web digest lists this; no creator video covers it."),
  },
];
