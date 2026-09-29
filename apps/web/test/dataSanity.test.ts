/**
 * Sanity checks on the generated game data, for patch day.
 *
 * A regenerated file can be wrong in ways nothing else notices: truncated by a
 * failed download, built from the previous patch's source, or missing a slot's
 * affixes because an item tag was renamed. These catch that. The bands are wide
 * enough for a normal patch's drift and narrow enough to fail a broken file —
 * if a real patch moves a count outside them, check the data, then widen the
 * band in the same commit. The refresh steps are in docs/DATA-REFRESH.md.
 *
 * atlas-tree.json has its own checks in atlasTree.test.ts.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CURRENT_PATCH } from "@/lib/constants";

const load = <T,>(file: string): T =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../../packages/data/generated/${file}`, import.meta.url)), "utf8")) as T;

interface ModTiers {
  gameVersion: string;
  baseTags: Record<string, string[]>;
  baseClass: Record<string, string>;
  mods: Record<string, { t: string; lvl: number; stats: [string, number, number][]; spawn?: [string, number][] }>;
}

describe("mod-tiers.json", () => {
  const tiers = load<ModTiers>("mod-tiers.json");

  it("is stamped with the patch the site says it covers", () => {
    // Bumping CURRENT_PATCH without regenerating (or the reverse) fails here.
    expect(tiers.gameVersion).toBe(CURRENT_PATCH);
  });

  it("has a full affix list", () => {
    expect(Object.keys(tiers.mods).length).toBeGreaterThan(2400);
    expect(Object.keys(tiers.mods).length).toBeLessThan(3600);
    const bad = Object.entries(tiers.mods).filter(
      ([, m]) => !m.stats.length || m.stats.some(([id, min, max]) => !id || !(min <= max)) || !(m.lvl >= 1),
    );
    expect(bad.map(([id]) => id)).toEqual([]);
  });

  // The workbench and replacement planner need prefixes AND suffixes that can
  // spawn on every equipment slot. A renamed spawn tag empties a slot silently.
  const SLOTS = [
    "Ring", "Amulet", "Belt", "Helmet", "Body Armour", "Boots", "Gloves", "Shield",
    "Bow", "Crossbow", "Wand", "Staff", "Sceptre", "Focus", "Quiver", "One Hand Mace",
    "Two Hand Mace", "Spear", "Jewel",
  ];

  it.each(SLOTS)("offers prefixes and suffixes for %s", (cls) => {
    const base = Object.keys(tiers.baseClass).find((b) => tiers.baseClass[b] === cls && tiers.baseTags[b]);
    expect(base, `no ${cls} base with tags`).toBeDefined();
    const tags = tiers.baseTags[base!]!;
    // The first spawn tag the base carries decides the weight, as in game.
    const weight = (spawn: [string, number][] = []) => spawn.find(([tag]) => tags.includes(tag))?.[1] ?? 0;
    const count = { p: 0, s: 0 } as Record<string, number>;
    for (const m of Object.values(tiers.mods)) if (weight(m.spawn) > 0 && m.t in count) count[m.t]!++;
    expect(count.p).toBeGreaterThan(10);
    expect(count.s).toBeGreaterThan(10);
  });
});

describe("bases.json", () => {
  const { gameVersion, bases } = load<{ gameVersion: string; bases: Record<string, { type: string; obtainable: boolean }> }>(
    "bases.json",
  );

  it("matches the patch and lists every slot's bases", () => {
    expect(gameVersion).toBe(CURRENT_PATCH);
    const all = Object.values(bases);
    expect(all.length).toBeGreaterThan(1400);
    expect(all.filter((b) => b.obtainable).length).toBeGreaterThan(1200);
    expect(all.every((b) => typeof b.type === "string" && b.type.length > 0)).toBe(true);
  });
});

describe("passive-tree.json", () => {
  const tree = load<{
    nodeCount: number;
    edgeCount: number;
    classStarts: Record<string, string>;
    ascendancies: unknown[];
    nodes: Record<string, unknown>;
  }>("passive-tree.json");

  it("is a whole tree with every class start", () => {
    expect(Object.keys(tree.nodes)).toHaveLength(tree.nodeCount);
    expect(tree.nodeCount).toBeGreaterThan(4000);
    expect(tree.edgeCount).toBeGreaterThan(4500);
    expect(Object.values(tree.classStarts).sort()).toEqual(["Druid", "Mercenary", "Monk", "Ranger", "Sorceress", "Warrior"]);
    for (const id of Object.keys(tree.classStarts)) expect(tree.nodes[id]).toBeDefined();
    expect(tree.ascendancies.length).toBeGreaterThanOrEqual(19);
  });
});

describe("pob-skills.json", () => {
  const skills = load<{ supports: { name: string }[]; actives: Record<string, string[]> }>("pob-skills.json");

  it("has supports and active skill types", () => {
    expect(skills.supports.length).toBeGreaterThan(400);
    expect(Object.keys(skills.actives).length).toBeGreaterThan(250);
    expect(skills.supports.every((s) => s.name)).toBe(true);
  });
});

describe("monster-stats.json", () => {
  const stats = load<{ tiers: { tier: number; areaLevel: number }[] }>("monster-stats.json");

  it("covers map tiers 1–16 at rising area levels", () => {
    expect(stats.tiers.map((t) => t.tier)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    for (let i = 1; i < stats.tiers.length; i++) {
      expect(stats.tiers[i]!.areaLevel).toBeGreaterThanOrEqual(stats.tiers[i - 1]!.areaLevel);
    }
  });
});
