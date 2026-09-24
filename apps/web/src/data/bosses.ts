import type { PinnacleBoss } from "@/lib/types";
import { strategySource, video05Source, videoSource } from "./sourceMeta";

export const pinnacleBosses: PinnacleBoss[] = [
  {
    id: "arbiter-of-ash",
    name: "Arbiter of Ash",
    mechanic: "apex",
    hpFloor: "Quest ~1.2M HP · uber ~5M+ (older figures)",
    fragmentCost: [
      { itemName: "Ancient Crisis Fragment (Citadel / Enigma Chamber)", quantity: 1 },
      { itemName: "Faded Crisis Fragment (Citadel)", quantity: 1 },
      { itemName: "Weathered Crisis Fragment (Citadel / Enigma Chamber)", quantity: 1 },
    ],
    gatingRequirements: [
      "Quest version: kill the Western and Eastern Enigma Chamber bosses (T10+) for the Ancient and Weathered fragments — the quest supplies the third",
      "Non-quest version: all three Crisis Fragments from Citadels (orange beams) or the Currency Exchange",
      "Place the fragments in the Burning Monolith",
    ],
    notes:
      "Quest fight: two phases, unlimited attempts, no XP loss, mechanic-heavy. Killing it unlocks 3-modifier (Regal) tablets. Since 0.5.5 it has Fire Resistance and Cold Vulnerability instead of All Elemental Resistances, so cold damage is favoured and fire is penalised. The non-quest version is the uber fight (older guides: ~5M standard, 22M+ uber, hard 55% phase transition).",
    source: videoSource(["5Vp_3gUFbwI@05:20", "jOU2zNgLxJ0@05:18", "lsu7-ITJe_M@12:07"], {
      note: "Resistance profile from the 0.5.5 patch notes; uber HP figures from the pre-0.5.5 strategy guide.",
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
      "Combine Origin Cradle + Origin Spark at Doryani / the Engine Room into an Origin Core, then carry it to the top of the Origin Tower",
      "Kill #2 needs a non-quest Core: one Matriarch + one Patriarch Hall found outside the Fortress (orange beam, usually paired) — or buy the Core/Cradle/Spark on the exchange",
      "5,000+ life and 80%+ relevant resistances recommended; be comfortable in T15 before kill #2",
    ],
    notes:
      "0.5.5: kill it twice — the second, non-quest kill completes the entire Precursor Fortress and unlocks every Atlas point, replacing the old repeat-5-times Cardinal Device loop. 45% Lightning Resistance and Fire Vulnerability, so lightning builds bring exposure and a curse. Two phases, unlimited attempts on the quest version. Phase 2 (web digest, unverified): around 40% it resets, spawns Aspect clones, and Divine Power orbs on the outer platforms grant the immunity you need to kill them. 0.5.4 added a Spear of Kitava drop.",
    source: videoSource(["uMHfOL8sT6I@05:20", "5Vp_3gUFbwI@07:39", "5Vp_3gUFbwI@08:26"], {
      note: "Two-kill rule confirmed by the 0.5.5 patch notes and two 0.5.5 creator videos. Exchange availability: Scorpius (jOU2zNgLxJ0@05:18).",
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
    gatingRequirements: [
      "Your first Abyss in a map reveals the Well of Souls",
      "Clear the top, bottom and right objectives around it, then kill Kulemak",
    ],
    notes:
      "Abyss's mechanic pinnacle — first kill grants ~6 Atlas points. Prioritise Balance of Power: Ulaman while questing; skip From Below / Sprawling Rapture until it's done.",
    source: video05Source(["VSeDfybR3Cc@14:10", "VSeDfybR3Cc@15:11"]),
  },
  {
    id: "olroth",
    name: "Olroth",
    mechanic: "expedition",
    fragmentCost: [],
    gatingRequirements: [
      "Logbook quest line from the Ruins of Kingsmarch: Medved → Vorana → Uhtred → Olroth",
      "Olroth drops Tiscalion's Flame — bring it to Kingsmarch and sail to the crater boss",
    ],
    notes:
      "Grand Expeditions award Atlas points in 0.5.5 (Lazy Exile). Older guides also list Runic Splinters as a fragment currency without a count.",
    source: video05Source(["VSeDfybR3Cc@30:23", "5Vp_3gUFbwI@10:44"], {
      note: "Boss and item names are from auto-captions; 'Tiscalion's Flame' is unverified.",
    }),
  },
  {
    id: "king-in-the-mists-bodach",
    name: "King in the Mists / The Bodach",
    mechanic: "ritual",
    fragmentCost: [{ itemName: "An Audience with the King (bought with Tribute)", quantity: 1 }],
    gatingRequirements: [
      "Spend Tribute on 'An Audience with the King' and use it at the Cracks of Nothingness → King in the Mists",
      "Return the body to the Ritual hub's effigy — it picks 5 maps; the last Ritual in each drops a body part",
      "Complete the effigy to summon The Bodach (the true pinnacle; older guides say T14+)",
    ],
    notes:
      "Bodach grants extra Ritual Atlas points; the rest come from nearby point maps. Web digests advise not running Ritual tablets during the 5 body-part maps (unverified).",
    source: video05Source(["VSeDfybR3Cc@25:21"]),
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
      "Run the Vaal city nodes, build a path to the top of the temple and kill the Architect",
      "Connect the Atziri Chambers and the Royal Access Chamber at the same time (rooms can bridge to them)",
      "6 beacon charges to open the fight (stores up to 60)",
    ],
    notes:
      "Went core in 0.5.0 (Fate of the Vaal); ~6 Atlas points. Temple passives (Offerings to the Queen, Military Reinforcements) work even without running the Temple. Drops Orb of Sacrifice + Vaal currency.",
    source: video05Source(["VSeDfybR3Cc@26:21", "VSeDfybR3Cc@27:21", "yHLuC_pnFco@21:29"], {
      note: "Corrected: Atziri is not a 'no setup' encounter — the Architect and both chambers come first.",
    }),
  },
];
