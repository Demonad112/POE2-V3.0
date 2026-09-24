import type { GlossaryTerm } from "@/lib/types";

/**
 * Endgame vocabulary a player meets in their first hours of mapping. Plain
 * definitions only — anything a creator video settles lives in the roadmap
 * with its citation, and these point there.
 */
export const glossary: GlossaryTerm[] = [
  {
    id: "g-waystone",
    term: "Waystone",
    definition:
      "The key that opens a map. Its tier sets the area level (T1 = 65 … T15 = 79). Its prefixes and suffixes only make the map harder; the implicit is what raises rewards.",
    seeStepId: "step-waystone-engine",
  },
  {
    id: "g-powerful-boss",
    term: "Powerful Map Boss",
    definition:
      "A map node with a red demon icon. Its boss drops a Waystone one tier higher — the only way up besides the 3→1 reforge bench.",
    seeStepId: "step-hilda-contract",
  },
  {
    id: "g-reforge",
    term: "Reforging bench (3→1)",
    definition:
      "Unlocked by an Act 3 quest. Three Waystones of one tier become one of the next tier.",
    seeStepId: "step-waystone-engine",
  },
  {
    id: "g-tablet",
    term: "Tablet (Precursor Tablet)",
    definition:
      "Socketed into a Waystone to add a mechanic or bonus to that map. Slots: magic Waystone 1, rare with 3+ mods 2, six mods 3. Tablet mods are pure upside, unlike Waystone mods.",
  },
  {
    id: "g-overseer-tablet",
    term: "Overseer Tablet",
    definition:
      "Unlocked by Eons of Domination. Slotted into a node without a powerful boss, it makes that map's boss Powerful — so it can drop a higher-tier Waystone.",
    seeStepId: "step-sustain-cluster",
  },
  {
    id: "g-atlas-points",
    term: "Atlas passive points",
    definition:
      "Spent on the Atlas tree to buff maps. They can't be refunded. Fortress maps, wall towers and mechanic quest lines give them; in 0.5.5 the second Arbiter of Divinity kill unlocks the rest at once.",
    seeStepId: "step-atlas-rules",
  },
  {
    id: "g-fortress",
    term: "Precursor Fortress",
    definition:
      "The walled region at the centre of the Atlas holding the main quest: Ancient Gateway, Burning Monolith, East/West Gateways, Enigma Chambers and the Origin Tower.",
    seeStepId: "step-precursor-tower",
  },
  {
    id: "g-crisis-fragment",
    term: "Crisis Fragments",
    definition:
      "Ancient, Faded and Weathered — the three keys for the Arbiter of Ash. The quest gives you two from the Enigma Chambers; the non-quest fight needs all three from Citadels or the exchange.",
    seeStepId: "step-enigma-chambers",
  },
  {
    id: "g-citadel",
    term: "Citadel",
    definition:
      "A special map marked by a massive coloured beam, guarded by a boss that drops a Crisis Fragment. Enigma Chambers are smaller versions.",
  },
  {
    id: "g-origin-core",
    term: "Origin Core (Cradle + Spark)",
    definition:
      "The key for the Arbiter of Divinity: an Origin Cradle from a Matriarch Hall plus an Origin Spark from a Patriarch Hall. A non-quest Core (Halls outside the Fortress) is what unlocks the full Atlas.",
    seeStepId: "step-repeat-divinity-loop",
  },
  {
    id: "g-masters",
    term: "Masters (Doryani, Hilda, Jado)",
    definition:
      "Three NPCs with their own point trees. You pick one Master per map setup: Hilda for boss rushes and Omen Abyss, Jado for unique and Lineage hunts, Doryani for safety and biome control.",
    seeStepId: "step-chain-doryani",
  },
  {
    id: "g-corrupted-nexus",
    term: "Corrupted nexus",
    definition:
      "The boss map at the heart of a corrupted region. Clearing it cleanses the region (bonus currency, Fracturing Orbs) and gives Doryani points.",
    seeStepId: "step-doryani-revival",
  },
  {
    id: "g-anomaly",
    term: "Anomaly map",
    definition:
      "Jado's special maps (e.g. Jade Isles). Take the Lineage Support drop nodes before running them.",
    seeStepId: "step-chain-jado",
  },
  {
    id: "g-barya",
    term: "Djinn Barya",
    definition:
      "The key for the Trial of the Sekhemas (Ascendancy points). Its level and trial count come from where it dropped; the lowest 4-trial Barya is level 75.",
    seeStepId: "step-level85-ascendancy",
  },
  {
    id: "g-honour",
    term: "Honour",
    definition:
      "The Trial of the Sekhemas' second health bar — run out and the trial fails. Relics with Honour Resistance (aim for 75%) protect it.",
    seeStepId: "step-precursor-tower",
  },
  {
    id: "g-monster-effectiveness",
    term: "Monster Effectiveness",
    definition:
      "Makes monsters tougher and scales every non-guaranteed drop — currency, items, Waystones. Worth taking unless your build can't handle the jump.",
    seeStepId: "step-sustain-cluster",
  },
  {
    id: "g-biome",
    term: "Biome",
    definition:
      "Each map's terrain type (Grass, Forest, Mountain, Desert, Swamp, Water). Biome passives buff maps of that type; city maps grant a choice of two.",
  },
  {
    id: "g-deliriousness",
    term: "Deliriousness / Grand Mirror",
    definition:
      "Delirium fog raises a map's Deliriousness; at 100% maps count toward the Simulacrum. A Grand Mirror (kill the boss and its mirrored copy) spreads fog to 10 nearby maps in 0.5.5.",
    seeStepId: "step-chain-delirium",
  },
  {
    id: "g-juice",
    term: "Juice / juicing",
    definition:
      "Stacking Waystone mods, tablets and Atlas passives to make a map more rewarding. Pointless before your Atlas is unlocked — boss-rush until then.",
    seeStepId: "step-juiced-loop",
  },
  {
    id: "g-revive",
    term: "Revives / portals",
    definition:
      "Each map starts with 6 portals; every Waystone modifier removes one. Dying to the map boss resets it to full life and empties the rest of the map.",
  },
];
