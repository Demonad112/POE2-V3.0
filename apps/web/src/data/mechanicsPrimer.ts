import type { PrimerFact, TierBreakpoint } from "@/lib/types";
import { video05Source, videoSource } from "./sourceMeta";

/** "Before your first map" facts — the rules the endgame never explains. */
export const primerFacts: PrimerFact[] = [
  {
    id: "primer-tiers",
    topic: "Tiers and area level",
    detail:
      "T1 = area level 65, +1 per tier, T15 = 79. T16 (area 80) only comes from Vaal-corrupting a T15 — which can also drop it to T14. T1–5 are white, T6–10 yellow, T11–15 red.",
    source: video05Source(["jOU2zNgLxJ0@08:22", "5Vp_3gUFbwI@00:45"]),
  },
  {
    id: "primer-mods",
    topic: "Waystone modifiers",
    detail:
      "Prefixes and suffixes only make the map harder; the Waystone's implicit is what scales rewards. Each modifier removes one of your 6 portals (revives) — a 6-mod map is one attempt.",
    source: video05Source(["zMFBAr1a6SA@02:04", "yHLuC_pnFco@05:24"]),
  },
  {
    id: "primer-boss-death",
    topic: "Dying to the map boss",
    detail:
      "The boss resets to full life and the rest of the map empties. Do side objectives before the boss.",
    source: video05Source(["yHLuC_pnFco@06:56"]),
  },
  {
    id: "primer-tablet-slots",
    topic: "Tablet slots",
    detail:
      "Magic Waystone = 1 tablet. Rare with 3+ mods (Transmute + Augment + Regal, or Alchemy) = 2. Six mods (Alchemy + 2 Exalts) = 3.",
    source: video05Source(["yHLuC_pnFco@09:14"]),
  },
  {
    id: "primer-tablet-mods",
    topic: "Tablet modifier cap",
    detail:
      "Tablets start at magic rarity (2 mods). Killing Arbiter of Ash unlocks 3 (Regal); the top of the tree after Arbiter of Divinity (Partial Translation) unlocks 4. Unlike Waystones, every tablet mod is pure upside.",
    source: video05Source(["lsu7-ITJe_M@12:07", "lsu7-ITJe_M@13:08"]),
  },
  {
    id: "primer-powerful-boss",
    topic: "Climbing tiers",
    detail:
      "Only Powerful Map Boss nodes (red demon icon) drop a Waystone one tier higher; the 3→1 reforge bench is the only other way up. Doryani sells one tier below your best completed map and restocks on every level-up.",
    source: videoSource(["uMHfOL8sT6I@03:03", "uMHfOL8sT6I@01:32"]),
  },
  {
    id: "primer-atlas-points",
    topic: "Where Atlas points come from",
    detail:
      "Fortress maps give points once you're past the Ancient Gateway; wall towers give a few extra. In 0.5.5 the second (non-quest) Arbiter of Divinity kill unlocks everything. League mechanics and Masters have their own point trees from their quest chains.",
    source: videoSource(["5Vp_3gUFbwI@03:49", "uMHfOL8sT6I@05:20"], {
      note: "Wall-tower point counts differ between sources (+3 vs +4), as does the total tree size (311 vs 335).",
    }),
  },
];

export const tierBreakpoints: TierBreakpoint[] = [
  {
    tier: "T1",
    areaLevel: "65",
    unlocks: "30% movement speed boots, +2 minion helmets",
    purpose: "Leave the campaign with basic structural items",
    source: video05Source(["jOU2zNgLxJ0@08:22"], {
      verified: "unverified",
      note: "Affix unlocks per tier come from the web digest; the area levels are from the videos.",
    }),
  },
  {
    tier: "T6–T7",
    areaLevel: "70–71",
    unlocks: "Higher resistance tiers and base defences; first power spike",
    purpose: "Fix your resistance caps before the Enigma Chambers",
    source: video05Source(["jOU2zNgLxJ0@08:22"], {
      verified: "unverified",
      note: "Scorpius names T6 and T11 as power spikes; the exact affix list is from the web digest.",
    }),
  },
  {
    tier: "T11",
    areaLevel: "75",
    unlocks:
      "T1 flat damage (rings/gloves), T1–2 life, T2 resistances/defences, +3 amulets, T2 weapon physical, level-18 gems",
    purpose: "The gearing checkpoint — best power per risk; park here until geared",
    source: video05Source(["VSeDfybR3Cc@09:07", "VSeDfybR3Cc@10:07"]),
  },
  {
    tier: "T15",
    areaLevel: "79",
    unlocks: "Top tiers of a few affixes (e.g. 35% movement speed) — plus more niche mods that dilute rolls",
    purpose: "Push only once T11 gear is done and T15 clears at a decent pace",
    source: video05Source(["jOU2zNgLxJ0@08:22", "VSeDfybR3Cc@10:07"], {
      verified: "conflicting",
      note: "Older guides describe T15 drops as item level 82; the videos put T15 at area level 79.",
    }),
  },
];
