import type { PinnacleBoss } from "@/lib/types";
import { atlasSource, patchSource, strategySource } from "./sourceMeta";

export const pinnacleBosses: PinnacleBoss[] = [
  {
    id: "arbiter-of-ash",
    name: "Arbiter of Ash",
    mechanic: "apex",
    hpFloor: "~5M HP standard, 22M+ uber",
    fragmentCost: [
      { itemName: "Crisis Fragment — Stone Citadel (Doryani)", quantity: 1 },
      { itemName: "Crisis Fragment — Copper Citadel (Jamanra)", quantity: 1 },
      { itemName: "Crisis Fragment — Iron Citadel (Count Geonor)", quantity: 1 },
    ],
    gatingRequirements: [
      "Kill both Enigma Chamber bosses (Precursor Refiner, Precursor Separator) to unlock Crisis Fragments",
      "Place all 3 fragments in the Burning Monolith",
    ],
    notes:
      "Hard 55% phase transition, fire-heavy encounter. Apex gateway boss before Arbiter of Divinity becomes accessible. Since 0.5.5 it no longer has All Elemental Resistances — it has Fire Resistance and Cold Vulnerability, so cold damage is favoured and fire damage is penalised.",
    source: patchSource({
      note: "Encounter notes from the 0.5.4b strategy guide; resistance profile from the 0.5.5 patch notes.",
    }),
  },
  {
    id: "arbiter-of-divinity",
    name: "Arbiter of Divinity",
    mechanic: "apex",
    fragmentCost: [
      { itemName: "Origin Cradle (from Matriarch Hall)", quantity: 1 },
      { itemName: "Origin Spark (from Patriarch Hall)", quantity: 1 },
    ],
    gatingRequirements: [
      "Arbiter of Ash killed first",
      "Turn in Origin Cradle + Origin Spark at the Engine Room for the Origin Core, then carry it to the top",
      "5,000+ life and 80%+ relevant resistances recommended before this tier",
    ],
    notes:
      "Since 0.5.5, a kill using the non-quest Origin Core completes the entire Precursor Fortress for the map owner, so the Atlas tree can be allocated freely; a kill using the quest Origin Core no longer completes a Fortress section. This replaces the old repeat-5-times Cardinal Device loop. It also no longer has All Elemental Resistances — it has Lightning Resistance and Fire Vulnerability, so fire damage is favoured and lightning is penalised. 0.5.4 added a Spear of Kitava drop.",
    source: patchSource({
      verified: "unverified",
      note: "0.5.5 patch notes state the full-Fortress completion but not how the non-quest Origin Core is obtained, or whether Cardinal Devices still exist — verify in-game.",
    }),
  },
  {
    id: "xesht",
    name: "Xesht",
    mechanic: "breach",
    fragmentCost: [{ itemName: "Breach Splinter", quantity: 300 }],
    gatingRequirements: [
      "Combine 300 Breach Splinters into a Breachstone at the Realmgate",
    ],
    notes:
      "Most accessible pinnacle. Drops The Pandemonius, Hand of Wisdom and Action.",
    source: strategySource(),
  },
  {
    id: "kulemak",
    name: "Vessel of Kulemak",
    mechanic: "abyss",
    fragmentCost: [],
    gatingRequirements: ["Full Abyss clear at the Well of Souls"],
    notes: "Abyss's mechanic pinnacle — first kill grants ~6 Atlas points.",
    source: strategySource(),
  },
  {
    id: "olroth",
    name: "Olroth",
    mechanic: "expedition",
    fragmentCost: [
      {
        itemName: "Runic Splinters (exact count not specified in source)",
        quantity: 1,
      },
    ],
    gatingRequirements: ["Farm Runic Splinters from Logbook dig sites"],
    source: atlasSource({
      verified: "unverified",
      note: "Source names Runic Splinters as the fragment currency but doesn't give an exact count — verify in-game.",
    }),
  },
  {
    id: "king-in-the-mists-bodach",
    name: "King in the Mists / The Bodach",
    mechanic: "ritual",
    fragmentCost: [],
    gatingRequirements: [
      "Farm Tribute at Ritual altars → 'An Audience with the King'",
      "King in the Mists appears at low tiers; The Bodach (true pinnacle) requires T14+",
    ],
    source: strategySource(),
  },
  {
    id: "tangmazu",
    name: "Tangmazu",
    mechanic: "delirium",
    hpFloor: "~7M HP",
    fragmentCost: [{ itemName: "Simulacrum Splinter", quantity: 300 }],
    gatingRequirements: [
      "Combine 300 Simulacrum Splinters into a Simulacrum (7 escalating waves — cut from 15 in patch 0.5.2)",
      "Wave 7 grants 2 Delirium Atlas points plus the Raven's Reflection key needed to fight Tangmazu at the Withered Willow",
    ],
    notes:
      "Omniphobia appears from ~wave 3, Kosis from ~wave 5. Tangmazu drops a unique amethyst ring and the Raven Staff (~25-30 Div). Since 0.5.5, Omniphobia and the Raven Trickster no longer have All Elemental Resistances.",
    source: strategySource(),
  },
  {
    id: "atziri-vaal-temple",
    name: "Atziri (Vaal Temple)",
    mechanic: "trial",
    fragmentCost: [],
    gatingRequirements: [
      "Pop the Vaal Temple encounter — no tablet/tower setup needed",
    ],
    notes:
      "Went core in 0.5.0 (Fate of the Vaal); near-zero investment relative to reward. Drops Orb of Sacrifice + Vaal currency.",
    source: strategySource(),
  },
];
