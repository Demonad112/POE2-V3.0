/**
 * Every node the guide points at on the Atlas map must exist in the tree data.
 * A renamed or mistyped node would otherwise leave a "Map" button that finds
 * nothing.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { atlasClusters, memoryForks } from "@/data/atlasTree";
import { atlasTrapNodes } from "@/data/trapNodes";

const tree = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../packages/data/generated/atlas-tree.json", import.meta.url)), "utf8")
) as {
  nodeCount: number;
  edgeCount: number;
  extent: { minX: number; maxX: number; minY: number; maxY: number };
  nodes: Record<string, { x: number; y: number; n: string }>;
  byName: Record<string, number[]>;
};

describe("atlas-tree.json", () => {
  it("is the 0.5.5 tree, linked", () => {
    expect(tree.nodeCount).toBeGreaterThanOrEqual(500);
    expect(tree.edgeCount).toBeGreaterThanOrEqual(300);
    expect(tree.byName["Royal Lenience"]).toBeDefined();
  });

  it("places every node inside its extent", () => {
    const { minX, maxX, minY, maxY } = tree.extent;
    for (const n of Object.values(tree.nodes)) {
      expect(n.x).toBeGreaterThanOrEqual(minX);
      expect(n.x).toBeLessThanOrEqual(maxX);
      expect(n.y).toBeGreaterThanOrEqual(minY);
      expect(n.y).toBeLessThanOrEqual(maxY);
    }
  });
});

describe("guide → tree node names", () => {
  const entries = [
    ...atlasClusters.map((c) => ({ id: c.id, names: c.treeNodes ?? [] })),
    ...memoryForks.map((f) => ({ id: f.id, names: f.treeNodes ?? [] })),
    ...atlasTrapNodes.map((t) => ({ id: t.id, names: t.treeNodes ?? [] })),
  ];

  it("names only nodes that exist in the tree", () => {
    const missing = entries.flatMap((e) => e.names.filter((n) => !tree.byName[n]).map((n) => `${e.id}: ${n}`));
    expect(missing).toEqual([]);
  });

  it("maps every named trap node", () => {
    const named = atlasTrapNodes.filter((t) => t.treeNodes?.length);
    expect(named.length).toBe(8);
    for (const t of named) expect(t.treeNodes).toContain(t.node);
  });

  it("maps every memory fork", () => {
    for (const f of memoryForks) expect(f.treeNodes?.length).toBeGreaterThan(0);
  });
});
