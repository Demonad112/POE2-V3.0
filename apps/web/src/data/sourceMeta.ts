import type { SourceRef } from "@/lib/types";

/**
 * Source precedence, highest first. When two sources disagree, the higher one
 * wins and the lower one is kept only as a note:
 *
 *   1. patch-0.5.5            — official patch notes
 *   2. creator-videos-0.5.5   — creators playing 0.5.5 (Fubgun, Lazy Exile)
 *   3. creator-videos-0.5     — 0.5.x creator guides (Asmodeus, Scorpius, …)
 *   4. atlas-tree-fundamentals / strategy-guide — the original 0.5.4 digests
 *   5. community-digest-0.5.5 — AI-compiled web research; never "confirmed"
 *                               on its own, only where a video backs it
 */
export const SOURCE_DOCS = {
  "atlas-tree-fundamentals": {
    title: "PoE 2 (0.5) — Atlas Tree Fundamentals & Progression + Endgame Mechanic Guides",
    builtFrom: "Mobalytics creator guides (Asmodeus, Fubgun, ds_lily, Lolcohol)",
    asOf: "July 2026",
  },
  "strategy-guide": {
    title:
      'Path of Exile 2 — League 0.5 "Return of the Ancients" Endgame Strategy Guide',
    builtFrom: "Community farming-strategy and meta aggregation",
    asOf: "2026-07-19",
  },
  "patch-0.5.5": {
    title: 'Path of Exile 2 0.5.5 "Forbidden Rites" patch notes',
    builtFrom: "Official Grinding Gear Games forum patch notes",
    asOf: "2026-09-04",
  },
  "creator-videos-0.5.5": {
    title: "0.5.5 creator videos (Fubgun, Lazy Exile)",
    builtFrom:
      "YouTube transcripts: Fubgun uMHfOL8sT6I (Atlas progression) and 2IvZ4D9b5bs (currency farms), Lazy Exile 5Vp_3gUFbwI (T1 to endgame)",
    asOf: "2026-09-24",
  },
  "creator-videos-0.5": {
    title: "0.5.x creator videos (Asmodeus, Fubgun, Scorpius, MyleSwi, Spud the King)",
    builtFrom:
      "YouTube transcripts: VSeDfybR3Cc, -R5KjDJQu9w, -oMeaRoAX-o, jOU2zNgLxJ0, yHLuC_pnFco, lsu7-ITJe_M, zMFBAr1a6SA",
    asOf: "2026-09-24",
  },
  "community-digest-0.5.5": {
    title: "Community web digest (0.5.5)",
    builtFrom:
      "AI-compiled summaries of Mobalytics, Maxroll, timesaver.gg and Reddit posts. Lowest precedence: anything only it supports is shown as unverified.",
    asOf: "2026-09-24",
  },
} as const;

/** Known cross-document conflicts, surfaced via SourceRef.note on affected records. */
export const KNOWN_CONFLICTS = [
  {
    id: "expedition-atlas-tree-existence",
    summary:
      "Asmodeus's guide (pre-0.5.4) says Expedition has no Atlas passive tree. The 0.5.4 'Grand Expedition' patch notes say a dedicated Expedition Atlas Passive Tree was added, and Lazy Exile (0.5.5, 5Vp_3gUFbwI@10:44) says the Grand Expedition quest line awards points. Treat 'no tree' as outdated.",
  },
  {
    id: "atlas-tree-size",
    summary:
      "Total Atlas points: 301 (earlier app copy), 311 (Fubgun, Spud) and 335 (Scorpius). Not hard-coded anywhere; the app says 'full Atlas tree'.",
  },
  {
    id: "wall-tower-points",
    summary:
      "Fortress wall towers give +3 Atlas points (Fubgun 0.5) or +4 (Scorpius). Moot after the second Arbiter of Divinity kill, which unlocks everything.",
  },
  {
    id: "t15-area-level",
    summary:
      "Scorpius and Spud: T15 is area level 79 (T16 = 80 via Vaal corruption). Older guides describe T15 drops as item level 82. Item level can exceed area level for some drops, so both may be partly right — treat 82 as unverified.",
  },
  {
    id: "quest-divinity-kill",
    summary:
      "Fubgun (0.5.5): the first, quest Arbiter of Divinity kill completes one Fortress section and the second, non-quest kill unlocks everything. The 0.5.5 patch notes and some web digests say the quest kill no longer completes a section. Both agree the second kill is what unlocks the full Atlas.",
  },
] as const;

export function atlasSource(
  overrides: Partial<SourceRef> = {}
): SourceRef {
  return {
    sourceDoc: "atlas-tree-fundamentals",
    asOfPatch: "0.5.4",
    verified: "confirmed",
    ...overrides,
  };
}

/**
 * A fact taken from the 0.5.5 patch notes rather than a guide. Records the
 * patch corrected carry this instead of their guide source, so a changed fact
 * is never attributed to a guide that predates it.
 */
export function patchSource(
  overrides: Partial<SourceRef> = {}
): SourceRef {
  return {
    sourceDoc: "patch-0.5.5",
    asOfPatch: "0.5.5",
    verified: "confirmed",
    ...overrides,
  };
}

export function strategySource(
  overrides: Partial<SourceRef> = {}
): SourceRef {
  return {
    sourceDoc: "strategy-guide",
    asOfPatch: "0.5.4b",
    verified: "confirmed",
    ...overrides,
  };
}

/** A claim from a creator video recorded on patch 0.5.5. */
export function videoSource(
  citations: string[],
  overrides: Partial<SourceRef> = {}
): SourceRef {
  return {
    sourceDoc: "creator-videos-0.5.5",
    asOfPatch: "0.5.5",
    verified: "confirmed",
    citations,
    ...overrides,
  };
}

/** A claim from a 0.5.x creator video that 0.5.5 didn't change. */
export function video05Source(
  citations: string[],
  overrides: Partial<SourceRef> = {}
): SourceRef {
  return {
    sourceDoc: "creator-videos-0.5",
    asOfPatch: "0.5.x",
    verified: "confirmed",
    citations,
    ...overrides,
  };
}

/**
 * A claim only the AI-compiled web digest makes. Always unverified: it mixes
 * in PoE1 mechanics and pre-0.5.5 rules, so nothing rests on it alone.
 */
export function digestSource(note: string): SourceRef {
  return {
    sourceDoc: "community-digest-0.5.5",
    asOfPatch: "0.5.5",
    verified: "unverified",
    note,
  };
}

/** Parses `"<youtubeId>@mm:ss"` (or `h:mm:ss`) into a timestamped link. */
export function citationUrl(citation: string): { href: string; label: string } | null {
  const at = citation.lastIndexOf("@");
  if (at <= 0) return null;
  const id = citation.slice(0, at);
  const stamp = citation.slice(at + 1).split(/[–-]/)[0];
  const parts = stamp.split(":").map(Number);
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return null;
  const seconds = parts.reduce((acc, n) => acc * 60 + n, 0);
  return { href: `https://youtu.be/${id}?t=${seconds}`, label: stamp };
}
