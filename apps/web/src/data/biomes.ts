import type { Biome } from "@/lib/types";
import { video05Source } from "./sourceMeta";

/**
 * Biome passive picks from Fubgun's 0.5 Atlas-optimisation video. 0.5.5 didn't
 * change biomes, but this is still a 0.5.x source.
 */
export const biomes: Biome[] = [
  {
    id: "biome-grass",
    name: "Grass",
    gives: "Pack size, spears, Summoning Circles",
    recommendedPick: "5% chance for Greater → Perfect currency (or Monster Effectiveness)",
    source: video05Source(["-oMeaRoAX-o@03:50"]),
  },
  {
    id: "biome-forest",
    name: "Forest",
    gives: "Up to +65% rare monsters",
    recommendedPick: "Increased number of rare monsters",
    source: video05Source(["-oMeaRoAX-o@04:35", "-oMeaRoAX-o@05:20"]),
  },
  {
    id: "biome-mountain",
    name: "Mountain",
    gives: "Tablet effect, Shrines, Strongboxes, pack size",
    recommendedPick: "Increased tablet quantity (rarity is also fine)",
    source: video05Source(["-oMeaRoAX-o@03:50", "-oMeaRoAX-o@05:20"]),
  },
  {
    id: "biome-desert",
    name: "Desert",
    gives: "Rare effect, more rares, rare modifiers",
    recommendedPick: "Monster Effectiveness (skip Survival of the Fittest if you farm Abyss)",
    source: video05Source(["-oMeaRoAX-o@03:50"]),
  },
  {
    id: "biome-swamp",
    name: "Swamp",
    gives: "Boss juice: rares become bosses, Essences on bosses",
    recommendedPick: "10% chance Exalted → Chaos",
    source: video05Source(["-oMeaRoAX-o@04:35"]),
  },
  {
    id: "biome-water",
    name: "Water",
    gives: "Magic pack size — the weakest biome",
    recommendedPick: "Chest currency (or gold if you need it)",
    source: video05Source(["-oMeaRoAX-o@04:35"]),
  },
];

export const biomeCityPairs = [
  { city: "Vaal cities", biomes: "Forest or Water" },
  { city: "Faridun cities", biomes: "Desert or Mountain" },
  { city: "Third city type (name unclear in captions)", biomes: "Grass or Swamp" },
];

export const BIOME_LOADOUT = "Grass + Forest + Mountain or Desert";

/** Which Atlas stat to push per farm, from the same video. */
export const atlasFocusByFarm = [
  { farm: "Ritual", focus: "Pack size (more favour) + rarity; Summoning Circle nodes" },
  { farm: "Breach — raw loot / rares", focus: "Monster Effectiveness + rarity" },
  { farm: "Breach — Hiveblood", focus: "Pack size" },
  { farm: "Abyss — Ulaman currency", focus: "Rarity" },
  { farm: "Abyss — Amanamu / Omen of Light", focus: "Monster Effectiveness; Rogue Exiles for Abyss jewels" },
  { farm: "Delirium", focus: "Boss nodes" },
  { farm: "Strongboxes", focus: "Still decent — research raw-currency Strongboxes" },
  { farm: "Essences", focus: "League-start value only" },
];
