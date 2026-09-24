import type { RoadmapStep } from "@/lib/types";
import { video05Source, videoSource } from "./sourceMeta";

/**
 * Step ids are the localStorage key for checklist progress, and action items
 * are keyed by index — keep ids stable and only append to an existing step's
 * actionItems. `order` is only a sort key and can change freely.
 *
 * Video ids used in citations:
 *   uMHfOL8sT6I Fubgun 0.5.5 Atlas · 5Vp_3gUFbwI Lazy Exile 0.5.5 ·
 *   2IvZ4D9b5bs Fubgun 0.5.5 farms · VSeDfybR3Cc Asmodeus ·
 *   -R5KjDJQu9w / -oMeaRoAX-o Fubgun 0.5 · jOU2zNgLxJ0 Scorpius ·
 *   yHLuC_pnFco MyleSwi · lsu7-ITJe_M / zMFBAr1a6SA Spud the King
 */
export const roadmapSteps: RoadmapStep[] = [
  // ─── Campaign end ────────────────────────────────────────────────────────
  {
    id: "step-campaign-end",
    order: 1,
    phase: "campaign-end",
    title: "Finish campaign, enter the Ziggurat Refuge",
    description:
      "Open the Waygate, rush the first map straight to its boss (ignore every mechanic in it), and talk to Doryani and Farrow to start quests — this unlocks your hideout map device. Set up your hideout and the Verisium Anvil — outside Runes of Aldur (Standard, Forbidden Rites) the Anvil unlocks by completing The Runeseeker quest in Act 4, and Farrow can then be placed in your hideout.",
    source: video05Source(["VSeDfybR3Cc@02:01"], {
      note: "Verisium Anvil unlock outside Runes of Aldur is from the 0.5.5 patch notes.",
    }),
  },
  {
    id: "step-atlas-rules",
    order: 2,
    phase: "campaign-end",
    title: "Know the three rules of the Atlas rush",
    description:
      "Until your Atlas is fully unlocked, maps are for pathing, not loot: mechanics are weak without Atlas points, so every hour spent juicing now is an hour your full tree is delayed.",
    tips: [
      "Boss-rush every map. Only click Essences and Shrines — they're fast. Skip Ritual, Breach, Abyss and the rest.",
      "The whole goal is Arbiter of Ash ×1 and Arbiter of Divinity ×2. In 0.5.5 the second Divinity kill unlocks every Atlas point at once.",
      "Atlas points can't be refunded. Check the trap-node list on the Atlas page before you allocate anything you don't recognise.",
      "Run the highest tier you can clear at a decent pace — not the highest tier you can survive. Higher tiers mean better item level, more XP, faster Atlas.",
    ],
    relatedMistakeIds: ["m-clearing-maps-pre-atlas", "m-atlas-trap-nodes"],
    source: videoSource([
      "5Vp_3gUFbwI@01:31",
      "uMHfOL8sT6I@04:35",
      "uMHfOL8sT6I@05:20",
    ]),
  },
  {
    id: "step-hilda-contract",
    order: 3,
    phase: "campaign-end",
    title: "Hilda's Camp — first Great Beast only → Mighty Prey",
    description:
      "Hilda's camp is right next to where you start. Kill only her first Great Beast and take Mighty Prey: 25% chance to upgrade a Normal Map Boss to a Powerful Map Boss, which drops a Waystone one tier higher. One point is enough for now — this is your core tier-climbing engine. Her next beast needs a T5+ Waystone, so leave the rest for later.",
    benchmarkGateIds: ["b-waystone-breakpoints"],
    source: videoSource(["5Vp_3gUFbwI@03:03", "VSeDfybR3Cc@03:02"], {
      note: "Spud the King (lsu7-ITJe_M@20:09) doesn't prioritise Hilda early; 2 of 3 progression guides do. Next-beast T5+ requirement: zMFBAr1a6SA@09:07.",
    }),
  },
  {
    id: "step-waystone-engine",
    order: 4,
    phase: "campaign-end",
    title: "Run the Waystone engine",
    description:
      "Waystone starvation is the #1 early-endgame stall. Only Powerful Map Boss nodes (red demon icon) and the reforge bench move you up a tier, so route every map around them.",
    actionItems: [
      "Reforge 3 same-tier Waystones into 1 of the next tier at the reforging bench (Act 3 quest) — go straight to T3+ at the start",
      "Buy Waystones from Doryani after every level-up: he sells one tier below your highest completed, and his stock refreshes each time you level",
      "Combine Doryani stones with the 3→1 bench to leapfrog tiers (e.g. buy T2/T3s, forge to T4/T5)",
      "Path through as many Powerful Map Boss nodes as possible, and put your single best Waystone into them",
      "Run Magic Waystones on normal nodes and Rare (Alchemy) on Powerful Map Boss nodes — alch red maps only when you're short on sustain",
      "After Eons of Domination: Transmute an Overseer Tablet and slot it on nodes without a powerful boss to make them powerful",
      "Buy backups at the quest gates: a few T6 after clearing T7, a few T11 after clearing T12 (gates need T6, T11 and T14)",
    ],
    tips: [
      "Example: holding 2× T9 and 1× T10, run the T9s to reach a Powerful node, then spend the T10 there for a guaranteed-ish T11.",
      "Waystone drop rates are near-100% at T1–T6 and fall off noticeably around T11 without sustain nodes.",
      "Doryani and 3→1 get expensive in gold at high tiers (≈20k per stone, ≈60k per T14 reforge).",
    ],
    relatedMistakeIds: ["m-ignore-waystone-sustain", "m-alch-low-tiers"],
    source: videoSource([
      "uMHfOL8sT6I@00:46",
      "uMHfOL8sT6I@01:32",
      "uMHfOL8sT6I@03:03",
      "5Vp_3gUFbwI@01:31",
      "lsu7-ITJe_M@10:07",
    ]),
  },

  // ─── Precursor Fortress ─────────────────────────────────────────────────
  {
    id: "step-precursor-tower",
    order: 5,
    phase: "precursor-fortress",
    title: "Rush the first Precursor Tower → Ancient Gateway → Burning Monolith",
    description:
      "The nearest Precursor Tower (about 3 maps away) reveals the Fortress. Path straight to the Ancient Gateway — maps inside the Fortress area start giving Atlas points — then to the Burning Monolith, through as many Powerful Map Boss nodes as you can. Grab the guaranteed trial-key (Djinn Barya) nodes just off the middle path.",
    actionItems: [
      "3rd Ascendancy at ~level 70 (slightly over-levelled) with a full 75% Honour Resistance relic set for the Trial of Sekhemas",
    ],
    tips: [
      "Since 0.5.5 the Trial of Sekhemas has inherent monster and reward bonuses from area level 65, because Atlas passives don't apply inside it.",
      "Early Atlas points go down the Essence path (fast currency, shortest route) toward the Waystone-quantity nodes on the right.",
      "Some guides suggest saving the guaranteed Barya node until you can run it with a T9+ Waystone so its key rolls high enough for the 4th Ascendancy (web-digest tip, not in the videos).",
    ],
    benchmarkGateIds: ["b-ascendancy-3-at-70", "b-honour-75"],
    source: videoSource([
      "5Vp_3gUFbwI@03:49",
      "uMHfOL8sT6I@06:50",
      "jOU2zNgLxJ0@00:45",
      "VSeDfybR3Cc@06:03",
    ]),
  },
  {
    id: "step-gateways",
    order: 6,
    phase: "precursor-fortress",
    title: "Light both Gateway beacons",
    description:
      "At the Burning Monolith you're missing two fragments. East Gateway: kill the Precursor Refiner and activate the beacon (needs a T5+ Waystone). West Gateway: kill the Precursor Separator. Scorpius does the lower-tier West side first.",
    benchmarkGateIds: ["b-gateway-t5"],
    source: videoSource(["5Vp_3gUFbwI@04:35", "VSeDfybR3Cc@06:03", "jOU2zNgLxJ0@01:30"]),
  },
  {
    id: "step-enigma-chambers",
    order: 7,
    phase: "precursor-fortress",
    title: "Enigma Chambers → Weathered + Ancient Crisis Fragments",
    description:
      "Both need a T10+ Waystone. Each Enigma Chamber is a smaller version of a Citadel: kill the boss in the Western and the Eastern chamber for the Ancient and Weathered Crisis Fragments. The quest supplies the third fragment for your first Arbiter of Ash.",
    tips: [
      "Want the chamber bosses easier? Clear your first T11 and buy T10s from Doryani to run them with.",
      "Don't clear Fortress nodes for their own sake — path to objectives only; the Arbiter of Divinity kills complete the rest.",
      "Claim the fragment in the chamber before you portal out (web-digest tip, not in the videos).",
    ],
    benchmarkGateIds: ["b-enigma-t10"],
    relatedMistakeIds: ["m-clearing-fortress-nodes"],
    source: videoSource(["5Vp_3gUFbwI@05:20", "jOU2zNgLxJ0@03:01", "VSeDfybR3Cc@06:03"], {
      note: "Corrected: Precursor Refiner/Separator are the Gateway bosses, not the Enigma Chamber bosses.",
    }),
  },
  {
    id: "step-sustain-cluster",
    order: 8,
    phase: "precursor-fortress",
    title: "Allocate the sustain/tablet-unlock cluster",
    description:
      "Allocate in this order — this block is 100% sustain and tablet unlocks, zero league mechanics. Eons of Domination unlocks Overseer Tablets; Atop the World unlocks generic Precursor Tablet drops while maxing Waystone drop chance. Putting early points into Abyss, Delirium or Breach here is the classic trap.",
    actionItems: [
      "Trapped Subordinate",
      "Pathkeepers",
      "Eons of Domination",
      "Valuable Paths",
      "The Chosen Path: Essences",
      "The Journey Ahead: Effectiveness",
      "Archaeological Interest",
      "Expanding Hordes",
      "Atop the World",
      "Optional variant (Spud): search \"waystone\" in the Atlas tree and take every Waystone-drop node first — some need area level 70+",
    ],
    tips: [
      "Undergeared? Scorpius's safer opener: shrine cluster → magic-monster circle → Eons of Contamination (irradiated tablets, area 70+) → Valuable Paths → Chosen Path (Rogue Exiles) → Journey Ahead → Archaeological Interest.",
    ],
    relatedMistakeIds: ["m-difficulty-nodes", "m-atlas-trap-nodes"],
    source: video05Source(["VSeDfybR3Cc@08:06", "lsu7-ITJe_M@04:04", "jOU2zNgLxJ0@08:22"]),
  },

  // ─── Arbiter of Ash ─────────────────────────────────────────────────────
  {
    id: "step-arbiter-of-ash",
    order: 9,
    phase: "arbiter-of-ash",
    title: "Kill Arbiter of Ash (quest version)",
    description:
      "Bring the two Enigma fragments to the Burning Monolith. The quest fight is ~1.2M HP with two phases, unlimited attempts and no XP loss — it's mechanic-heavy, so learn it rather than face-tank it. Since 0.5.5 it has Fire Resistance and Cold Vulnerability instead of All Elemental Resistances. Upgrade gear before you try, or you'll be here a while.",
    tips: [
      "The kill unlocks the Atlas lock that lets tablets roll 3 modifiers (Regal) — a big sustain spike, so beat Ash as fast as possible.",
      "Too weak? Don't grind Fortress nodes. Pivot to one league mechanic to gear up, then come back.",
      "The non-quest (uber) version needs all three Crisis Fragments — Ancient, Faded and Weathered — from Citadels or the Currency Exchange. Older guide figures put it at ~5M HP standard / 22M+ uber with a hard 55% phase transition.",
    ],
    source: videoSource(
      ["5Vp_3gUFbwI@05:20", "lsu7-ITJe_M@12:07", "VSeDfybR3Cc@07:05", "jOU2zNgLxJ0@05:18"],
      {
      note: "Resistance profile from the 0.5.5 patch notes. The uber HP figures are from the pre-0.5.5 strategy guide.",
    }),
  },

  // ─── T11 checkpoint ─────────────────────────────────────────────────────
  {
    id: "step-t11-park",
    order: 10,
    phase: "t11-checkpoint",
    title: "Grind T11 as the key gearing checkpoint",
    description:
      "T11 Waystones are area level 75 — enough for tier-1 flat damage on rings/gloves, tier-1/2 life, tier-2 resistances and defences, +3 amulets, tier-2 physical on weapons and level-18 gems. T15 rarely does better. If T14–T15 is slow for your build, stop climbing and farm T11 until your gear is right.",
    tips: [
      "Fubgun's nuance: run the highest tier you clear at a decent pace — don't spend 50–80% longer per map for slightly better drops.",
      "Look up your weapon base's item-level breakpoint (poe2db / wiki) and rush to the tier that drops it — weapons are usually the biggest upgrade.",
    ],
    benchmarkGateIds: ["b-t11-gear-floor", "b-waystone-5mod"],
    relatedMistakeIds: ["m-rush-t15", "m-defenses-before-tiers"],
    source: video05Source(["VSeDfybR3Cc@09:07", "uMHfOL8sT6I@01:32", "uMHfOL8sT6I@03:03"]),
  },
  {
    id: "step-doryani-revival",
    order: 11,
    phase: "t11-checkpoint",
    title: "Take one Doryani point for the extra revival",
    description:
      "Clear the nearest corrupted zone's nexus (kill its boss) to unlock Doryani and one point — spend it on the extra revive.",
    source: video05Source(["VSeDfybR3Cc@13:09"]),
  },
  {
    id: "step-delirium-part1",
    order: 12,
    phase: "t11-checkpoint",
    title: "Delirium Part 1 only — amulet anointing unlock",
    description:
      "Path to the Withered Willow, kill 5 map bosses with delirium mirror fog active to unlock amulet anointing, then clear the first 4 passive-point maps for more liquid emotion drops. Otherwise just pass through mirrors incidentally — don't push Delirium further yet, it's the hardest mechanic and is sequenced last. Skip it entirely if your build has no cheap anoint.",
    source: video05Source(["VSeDfybR3Cc@14:10", "5Vp_3gUFbwI@06:53"]),
  },
  {
    id: "step-abyss-breach",
    order: 13,
    phase: "t11-checkpoint",
    title: "Layer Abyss, then Breach, while mapping",
    description:
      "Canonical opener: Abyss (universal currency, Desecrated Bones, Omens; Well of Souls → Kulemak), then Breach (jewellery and catalysts at the Monastery → Xesht) — best for early gearing, especially belts. Abyss → Ritual is a valid alternative. Point maps can be run at your cheapest Waystone tier.",
    tips: [
      "On every mechanic point map, finish the mechanic before you step into the boss arena (the checkpoint turns orange) — killing the boss first sometimes fails to award the point.",
    ],
    relatedMistakeIds: ["m-golden-rule-tablets-while-questing", "m-boss-before-mechanic"],
    source: video05Source(["VSeDfybR3Cc@14:10", "zMFBAr1a6SA@14:11"]),
  },
  {
    id: "step-level85-ascendancy",
    order: 14,
    phase: "t11-checkpoint",
    title: "Hit level 85+, finish your 4th Ascendancy",
    description:
      "The lowest 4-trial Barya is level 75, which T11 farming guarantees. The 3rd and 4th Ascendancy points are ~30–40% more damage for most classes — \"optional, but not really\".",
    benchmarkGateIds: ["b-level85-ascendancy"],
    source: videoSource(["5Vp_3gUFbwI@06:06", "VSeDfybR3Cc@18:13"]),
  },

  // ─── Arbiter of Divinity (2 kills) ──────────────────────────────────────
  {
    id: "step-find-halls",
    order: 15,
    phase: "arbiter-of-divinity-loop",
    title: "Quest Halls: Matriarch Hall + Patriarch Hall",
    description:
      "At the Origin Tower, Doryani sends you to the Patriarch Hall (Origin Spark) and Matriarch Hall (Origin Cradle) either side of the tower. Both bosses are hard — you should be comfortable in red maps. Look for the smooth orange beam; the pair usually spawns together.",
    source: videoSource(["5Vp_3gUFbwI@06:53", "lsu7-ITJe_M@13:08"]),
  },
  {
    id: "step-kill-divinity",
    order: 16,
    phase: "arbiter-of-divinity-loop",
    title: "Kill #1: quest Arbiter of Divinity",
    description:
      "Combine the Cradle and Spark into the Origin Core (Doryani / Engine Room), carry it to the top of the Origin Tower and kill the Arbiter. Two phases, unlimited attempts, no XP loss. It has 45% Lightning Resistance and Fire Vulnerability (0.5.5) — lightning builds should bring exposure and a curse.",
    tips: [
      "This first kill will NOT unlock your full Atlas — that's kill #2. Players who stop here think their tree is bugged.",
      "The kill unlocks the top of the Atlas tree — finish that line (Partial Translation) for 4-modifier tablets.",
    ],
    benchmarkGateIds: ["b-pinnacle-readiness"],
    relatedMistakeIds: ["m-quest-divinity-expectation"],
    source: videoSource(["5Vp_3gUFbwI@07:39", "uMHfOL8sT6I@06:50"], {
      verified: "conflicting",
      note: "Fubgun's video (recorded before launch) says kill #1 completes one Fortress section; the 0.5.5 patch notes say a quest-core kill no longer does. Both agree kill #2 unlocks everything.",
    }),
  },
  {
    id: "step-memory-forks",
    order: 17,
    phase: "arbiter-of-divinity-loop",
    title: "Allocate the top-of-tree passives and memory forks",
    description:
      "Reverse Transcription (Regal tablets) → Rogue Exile cluster (Competing Explorers, Competitive Archaeology — early jewellery) → essence/magic-monster paths → Mountain Mastery: Tablets, then the three memory forks. Grab them immediately after the first Divinity kill.",
    actionItems: [
      "Top-left fork: Risk and Reward, Enigmatic Intensification, Memories of the Vaal/Maraketh",
      "Top-right fork: Controlled Climates, Hard-Won Treasures, Memories of the Ezomytes/Karui",
      "Top fork: Desert Mastery: Effectiveness, Curiously Durable Stone, Partial Translation",
      "Hidden Scars + From Distance Untold (Fracturing Orbs) — take them as you leave the Citadel area",
      "Anomaly-map Lineage Support drop nodes — before you run any anomaly map or Jado quest",
    ],
    relatedMistakeIds: ["m-lineage-nodes-late"],
    source: video05Source([
      "VSeDfybR3Cc@19:15",
      "VSeDfybR3Cc@21:17",
      "lsu7-ITJe_M@16:08",
      "jOU2zNgLxJ0@12:12",
    ]),
  },
  {
    id: "step-repeat-divinity-loop",
    order: 18,
    phase: "arbiter-of-divinity-loop",
    title: "Hunt one Matriarch + Patriarch pair outside the Fortress",
    description:
      "For kill #2 you need a non-quest Origin Core: find one Matriarch Hall and one Patriarch Hall outside the Fortress walls (orange beam in the fog — if you see one, the other is close), clear both, and combine the Cradle and Spark. The old 5-cycle Cardinal Device loop is gone.",
    tips: [
      "Path outward in one direction from a Fortress wall tower — don't run random maps.",
      "Clear corrupted nexuses you pass for Doryani points (Stitch the Flesh → Hidden Patterns → Remnants of the Greatness).",
      "Save high Waystone-drop stones and tablets for the Hall bosses — extra Cradles/Sparks sell.",
      "The Origin Core, Cradle and Spark can also be bought on the Currency Exchange.",
    ],
    source: videoSource(["uMHfOL8sT6I@05:20", "uMHfOL8sT6I@06:05", "5Vp_3gUFbwI@08:26"], {
      note: "Hall-hunting tips from Asmodeus (VSeDfybR3Cc@22:18); exchange availability from Scorpius (jOU2zNgLxJ0@05:18).",
    }),
  },
  {
    id: "step-cardinal-device",
    order: 19,
    phase: "arbiter-of-divinity-loop",
    title: "Kill #2: non-quest Arbiter of Divinity → full Atlas unlocked",
    description:
      "Kill the stronger, non-quest Arbiter of Divinity with your non-quest Origin Core. Since 0.5.5 this completes the entire Precursor Fortress and unlocks every Atlas point at once — no region-by-region clearing. (Before 0.5.5 each kill let you hit a Cardinal Device for one ~40-point region, five times over.)",
    tips: [
      "Readiness: your character should already handle T15.",
      "You can delay it: full Atlas points make every map harder, and the non-quest boss is tougher.",
    ],
    benchmarkGateIds: ["b-divinity-t15"],
    relatedMistakeIds: ["m-quest-divinity-expectation"],
    source: videoSource(["uMHfOL8sT6I@05:20", "uMHfOL8sT6I@06:50", "5Vp_3gUFbwI@07:39"], {
      note: "Confirmed by the 0.5.5 patch notes and two 0.5.5 creator videos. Delay option: Spud the King (lsu7-ITJe_M@15:08).",
    }),
  },
  {
    id: "step-spend-full-tree",
    order: 20,
    phase: "arbiter-of-divinity-loop",
    title: "Spend the full tree — skip the trap nodes",
    description:
      "With every point unlocked, fill the tree toward your farm. Check the trap-node list first: points can't be refunded.",
    actionItems: [
      "Search \"rare\" and \"tablet\" in the Atlas tree and take them all",
      "Skip Man Trap, Survival of the Fittest (if you'll farm Abyss) and the hive-seeded Breach node (unless you farm hives)",
      "Doryani branch: Stitch the Flesh → Hidden Patterns → Remnants of the Greatness → Map Irradiation or Volatile Connection",
      "Leave the city/middle-region nodes for last if you farm outside cities",
      "Pick your biomes (Atlas page) to match your farm",
    ],
    relatedMistakeIds: ["m-atlas-trap-nodes"],
    source: videoSource([
      "uMHfOL8sT6I@07:37",
      "5Vp_3gUFbwI@09:12",
      "-R5KjDJQu9w@08:19",
      "VSeDfybR3Cc@22:18",
    ]),
  },

  // ─── Full tree ──────────────────────────────────────────────────────────
  {
    id: "step-close-out-tree",
    order: 21,
    phase: "full-tree",
    title: "Close out the remaining tree",
    description:
      "Once the Fortress is complete, remaining points go to generic quantity/rarity/pack-size, then the mechanic sub-trees you still want. Recommended close-out order: Ritual → Vaal Temple → Delirium (hardest last). Fubgun's alternative: pick the one mechanic you'll farm right after the first Divinity kill and earn currency with its tablets while you hunt Halls.",
    relatedMistakeIds: ["m-spread-atlas-points"],
    source: video05Source(["VSeDfybR3Cc@25:21", "-R5KjDJQu9w@06:02"]),
  },

  // ─── Masters & league quest chains ──────────────────────────────────────
  {
    id: "step-chain-doryani",
    order: 22,
    phase: "masters-and-mechanics",
    title: "Master: Doryani — corrupted nexuses",
    description:
      "Doryani enhances base maps and biome control; his branch is the best for exploration. Each corrupted nexus you clear cleanses its region (cleansed maps grant bonus currency and can drop Fracturing Orbs).",
    actionItems: [
      "Clear 1 corrupted nexus — unlocks Doryani + 1 point",
      "Clear 3 corrupted nexuses in total",
      "Kill the Mired Fury that spawns after the third",
    ],
    source: videoSource(["uMHfOL8sT6I@10:40", "VSeDfybR3Cc@22:18"]),
  },
  {
    id: "step-chain-hilda",
    order: 23,
    phase: "masters-and-mechanics",
    title: "Master: Hilda — Great Beasts",
    description:
      "Hilda reveals Great Beasts in maps near her camp. Best Master for boss-rush and Omen-Abyss setups.",
    actionItems: [
      "Great Beast #1 (done at campaign end for Mighty Prey)",
      "Great Beasts #2 and #3 (from T5+)",
      "Immutable Fury quest line → Great Beast #4 in a nearby map",
    ],
    source: videoSource(["5Vp_3gUFbwI@09:12", "uMHfOL8sT6I@10:40"]),
  },
  {
    id: "step-chain-jado",
    order: 24,
    phase: "masters-and-mechanics",
    title: "Master: Jado — Sealed Vault and anomaly maps",
    description:
      "Jado's unlock is the Sealed Vault (the node with blood coming out, usually right in front of the Fortress). He's the Master for exceptional items and Lineage Support gems.",
    actionItems: [
      "Allocate the anomaly-map Lineage Support drop nodes first",
      "Clear the Sealed Vault / first anomaly map to unlock Jado",
      "Clear the four anomaly maps he lists (e.g. Jade Isles, Relic Mansion, Sacred Reservoir)",
    ],
    relatedMistakeIds: ["m-lineage-nodes-late"],
    source: video05Source(["VSeDfybR3Cc@29:21", "uMHfOL8sT6I@10:40"], {
      note: "Anomaly map names are from auto-captions and may be slightly off.",
    }),
  },
  {
    id: "step-chain-ritual",
    order: 25,
    phase: "masters-and-mechanics",
    title: "Ritual — King in the Mists → The Bodach",
    description:
      "Ritual's hub sits next to the Fortress. Quest it without Ritual tablets.",
    actionItems: [
      "Path to the Ritual hub and run its point maps",
      "Spend Tribute on 'An Audience with the King'",
      "Use it at the Cracks of Nothingness and kill the King in the Mists",
      "Bring the body back to the effigy — it picks 5 maps",
      "Run the 5 maps; the last Ritual in each drops a body part",
      "Complete the effigy and kill The Bodach",
      "Finish the remaining nearby Ritual point maps",
    ],
    tips: [
      "Don't run Ritual tablets during the 5 body-part maps (web-digest tip; tablets may interfere with the quest drop).",
    ],
    relatedMistakeIds: ["m-golden-rule-tablets-while-questing"],
    source: video05Source(["VSeDfybR3Cc@25:21", "5Vp_3gUFbwI@09:57"]),
  },
  {
    id: "step-chain-vaal-temple",
    order: 26,
    phase: "masters-and-mechanics",
    title: "Vaal Temple — Architect → Atziri",
    description:
      "Build roads and rooms toward the top of the temple rather than sprawling wide. Its passives (Offerings to the Queen, Military Reinforcements) work even when you don't run the Temple.",
    actionItems: [
      "Run the Vaal city nodes and build a path to the top",
      "Kill the Architect",
      "Connect the Atziri Chambers and the Royal Access Chamber at the same time (rooms can bridge the gap)",
      "Collect 6 beacon charges (stores up to 60) and kill Atziri — about 6 points",
    ],
    source: video05Source(["VSeDfybR3Cc@26:21", "VSeDfybR3Cc@27:21", "yHLuC_pnFco@21:29"]),
  },
  {
    id: "step-chain-delirium",
    order: 27,
    phase: "masters-and-mechanics",
    title: "Delirium — Grand Mirror → Simulacrum → Tangmazu",
    description:
      "Part 2 of Delirium, saved for last because it's the hardest. Since 0.5.5 Grand Mirror fog spreads to exactly 10 maps and pack count stops scaling past 100% Deliriousness.",
    actionItems: [
      "Part 1 done (Withered Willow, 5 fogged bosses → anoints)",
      "Find a Grand Mirror: kill the map boss and its mirrored copy to spread the fog",
      "Push fogged maps to 100% Deliriousness",
      "Run the Simulacrum (7 waves) for the Raven's Reflection",
      "Take it to the Withered Willow and kill Tangmazu",
      "Clear the remaining >100% point maps",
    ],
    source: video05Source(["VSeDfybR3Cc@28:21"], {
      note: "Fog-spread and pack-count changes are from the 0.5.5 patch notes.",
    }),
  },
  {
    id: "step-chain-abyss",
    order: 28,
    phase: "masters-and-mechanics",
    title: "Abyss — Well of Souls → Kulemak",
    description:
      "Your first Abyss in a map reveals the Well of Souls. Prioritise Balance of Power: Ulaman; avoid From Below / Sprawling Rapture while questing (bigger Abysses are slower).",
    actionItems: [
      "Clear the top, bottom and right objectives around the Well of Souls",
      "Kill Kulemak (~6 points)",
    ],
    source: video05Source(["VSeDfybR3Cc@14:10", "VSeDfybR3Cc@15:11"]),
  },
  {
    id: "step-chain-breach",
    order: 29,
    phase: "masters-and-mechanics",
    title: "Breach — Monastery → Breach Colony → Xesht",
    description:
      "Unlocks the Genesis Tree and Hivemind. Sub-tree priority: Breeding Program: Banded Fruit → Diverse Control → monster-count nodes → Sole Purpose: Destruction.",
    actionItems: [
      "Path to the Monastery of the Keepers and run its point maps",
      "Clear the hives and the Breach Colony",
      "Combine 300 Breach Splinters and kill Xesht",
    ],
    source: video05Source(["VSeDfybR3Cc@16:12", "jOU2zNgLxJ0@13:44"]),
  },
  {
    id: "step-chain-expedition",
    order: 30,
    phase: "masters-and-mechanics",
    title: "Expedition — Ruins of Kingsmarch → Olroth → crater",
    description:
      "Follow the Logbook quest line from the Ruins of Kingsmarch. Grand Expeditions award Atlas points in 0.5.5 — and Expedition is the #1 farm, so this chain pays for itself.",
    actionItems: [
      "Get the Logbook at the Ruins of Kingsmarch and clear its Expeditions",
      "Kill Medved",
      "Kill Vorana",
      "Kill Uhtred",
      "Kill Olroth and take Tiscalion's Flame",
      "Bring it back to Kingsmarch, sail to the crater and kill its boss",
    ],
    source: video05Source(["VSeDfybR3Cc@30:23", "5Vp_3gUFbwI@10:44"], {
      note: "Boss and item names are from auto-captions; 'Tiscalion's Flame' is unverified.",
    }),
  },

  // ─── Juiced farming ─────────────────────────────────────────────────────
  {
    id: "step-juiced-loop",
    order: 31,
    phase: "juiced-farming",
    title: "Commit to a juiced single-mechanic farming loop",
    description:
      "Pick one S-tier farm from the dashboard (Expedition, Omen Abyss, Breach Hiveblood, Delirium/Lineage rush), match biomes and tablets to it, and pair the right Master (Hilda for boss rushes and Omen Abyss, Jado for unique/Lineage hunts, Doryani for safety and biome control).",
    actionItems: [
      "Choose a farm from the ranked strategy list",
      "Set biomes to match it (default loadout: Grass + Forest + Mountain or Desert)",
      "Roll Waystones: Alchemy + 2 Exalts = 6 mods = 3 tablet slots (zero revives)",
    ],
    tips: [
      "Advanced (web digest, unverified): with Omens that block rarity/quantity/effectiveness rerolls active, Chaos a 6-mod Waystone to force monster-rarity and Waystone-drop mods.",
    ],
    relatedMistakeIds: ["m-master-swap", "m-burn-tablets-early"],
    source: videoSource(["2IvZ4D9b5bs@01:40", "-oMeaRoAX-o@05:20", "yHLuC_pnFco@09:14"]),
  },
];

