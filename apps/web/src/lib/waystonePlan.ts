/**
 * The Waystone planner: given the highest tier a player has completed, say
 * what to buy, what to roll, and which quest gate comes next.
 *
 * Every rule here restates a roadmap step (see `stepId`), so the planner can
 * never drift from the checklist. Tier → area level is T1 = 65 … T15 = 79,
 * with T16 (area 80) only from Vaal-corrupting a T15.
 */

export const MAX_NATURAL_TIER = 15;
export const MAX_TIER = 16;

export interface WaystoneGate {
  tier: number;
  label: string;
  stepId: string;
}

export const WAYSTONE_GATES: WaystoneGate[] = [
  { tier: 5, label: "East Gateway needs a T5+ Waystone", stepId: "step-gateways" },
  { tier: 6, label: "First quest gate — keep a few T6 backups", stepId: "step-waystone-engine" },
  { tier: 10, label: "Enigma Chambers need T10+", stepId: "step-enigma-chambers" },
  { tier: 11, label: "T11 gearing checkpoint (area level 75)", stepId: "step-t11-park" },
  { tier: 14, label: "Last quest gate — red-map territory for the Halls", stepId: "step-find-halls" },
  { tier: 15, label: "Comfortable in T15 → ready for Divinity kill #2", stepId: "step-cardinal-device" },
];

export type TierBand = "none" | "white" | "yellow" | "red" | "corrupted";

export function areaLevel(tier: number): number {
  return 64 + tier;
}

export function tierBand(tier: number): TierBand {
  if (tier <= 0) return "none";
  if (tier <= 5) return "white";
  if (tier <= 10) return "yellow";
  if (tier <= MAX_NATURAL_TIER) return "red";
  return "corrupted";
}

export interface WaystonePlan {
  highest: number;
  /** The tier to run next — never above T15, since T16 only comes from corruption. */
  nextTier: number;
  nextAreaLevel: number;
  band: TierBand;
  /** What Doryani sells: one tier below the highest completed. Null before T2. */
  doryaniSells: number | null;
  /** The 3→1 bench recipe that moves you up from your current tier. */
  reforge: string | null;
  nextGate: WaystoneGate | null;
  gatesPassed: WaystoneGate[];
  /** Backup stones worth holding for quest gates at this point. */
  backups: string[];
  rolling: string;
}

export function planWaystones(highestRaw: number): WaystonePlan {
  const highest = Math.max(0, Math.min(MAX_TIER, Math.round(highestRaw)));
  const nextTier = Math.min(Math.max(highest + 1, 1), MAX_NATURAL_TIER);
  const band = tierBand(nextTier);

  const backups: string[] = [];
  if (highest >= 7) backups.push("a few T6 (buy from Doryani)");
  if (highest >= 12) backups.push("a few T11");
  if (highest >= MAX_NATURAL_TIER) backups.push("a stock of T14s");

  const rolling =
    band === "white"
      ? "Transmute (magic) everything. Put your best stone into Powerful Map Boss nodes — they're the only way up besides the 3→1 bench."
      : band === "yellow"
        ? "Magic on normal nodes, Rare on Powerful Map Boss nodes. Once you have Eons of Domination, a transmuted Overseer Tablet turns a normal node into a Powerful one."
        : "Alch red maps only if you're short on sustain; run Magic if you're over-sustained. After the full Atlas: Alchemy + 2 Exalts = 6 mods = 3 tablet slots (zero revives).";

  return {
    highest,
    nextTier,
    nextAreaLevel: areaLevel(nextTier),
    band,
    doryaniSells: highest >= 2 ? Math.min(highest - 1, 14) : null,
    reforge:
      highest >= 1 && highest < MAX_NATURAL_TIER
        ? `3× T${highest} → 1× T${highest + 1} at the reforging bench`
        : null,
    nextGate: WAYSTONE_GATES.find((g) => g.tier > highest) ?? null,
    gatesPassed: WAYSTONE_GATES.filter((g) => g.tier <= highest),
    backups,
    rolling,
  };
}
