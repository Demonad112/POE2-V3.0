/**
 * Guide-content integrity. The guide is hand-written data, so these catch the
 * mistakes review misses: a step pointing at a gate id that doesn't exist, a
 * duplicated id silently sharing saved progress, or a web-digest claim shown
 * as confirmed.
 */
import { describe, expect, it } from "vitest";
import { roadmapSteps } from "@/data/roadmap";
import { benchmarkGates } from "@/data/benchmarks";
import { commonMistakes } from "@/data/commonMistakes";
import { atlasClusters, memoryForks } from "@/data/atlasTree";
import { farmingStrategies } from "@/data/strategies";
import { pinnacleBosses } from "@/data/bosses";
import { atlasTrapNodes } from "@/data/trapNodes";
import { biomes } from "@/data/biomes";
import { primerFacts, tierBreakpoints } from "@/data/mechanicsPrimer";
import { glossary } from "@/data/glossary";
import { citationUrl } from "@/data/sourceMeta";
import { PHASE_ORDER } from "@/lib/roadmapOrder";
import { WAYSTONE_GATES } from "@/lib/waystonePlan";
import type { SourceRef } from "@/lib/types";

const stepIds = new Set(roadmapSteps.map((s) => s.id));

function expectUnique(ids: string[]) {
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  expect(dupes).toEqual([]);
}

const allSources: [string, SourceRef][] = [
  ...roadmapSteps.map((r) => [r.id, r.source] as [string, SourceRef]),
  ...benchmarkGates.map((r) => [r.id, r.source] as [string, SourceRef]),
  ...commonMistakes.map((r) => [r.id, r.source] as [string, SourceRef]),
  ...atlasClusters.map((r) => [r.id, r.source] as [string, SourceRef]),
  ...memoryForks.map((r) => [r.id, r.source] as [string, SourceRef]),
  ...farmingStrategies.map((r) => [r.id, r.source] as [string, SourceRef]),
  ...pinnacleBosses.map((r) => [r.id, r.source] as [string, SourceRef]),
  ...atlasTrapNodes.map((r) => [r.id, r.source] as [string, SourceRef]),
  ...biomes.map((r) => [r.id, r.source] as [string, SourceRef]),
  ...primerFacts.map((r) => [r.id, r.source] as [string, SourceRef]),
  ...tierBreakpoints.map((r) => [r.tier, r.source] as [string, SourceRef]),
];

describe("ids", () => {
  it("are unique within each data set", () => {
    expectUnique(roadmapSteps.map((s) => s.id));
    expectUnique(benchmarkGates.map((s) => s.id));
    expectUnique(commonMistakes.map((s) => s.id));
    expectUnique(atlasClusters.map((s) => s.id));
    expectUnique(farmingStrategies.map((s) => s.id));
    expectUnique(pinnacleBosses.map((s) => s.id));
    expectUnique(atlasTrapNodes.map((s) => s.id));
    expectUnique(glossary.map((s) => s.id));
  });

  it("keep every step id that saved progress may reference", () => {
    // Removing or renaming one of these silently drops players' ticks.
    for (const id of [
      "step-campaign-end",
      "step-hilda-contract",
      "step-precursor-tower",
      "step-gateways",
      "step-enigma-chambers",
      "step-sustain-cluster",
      "step-arbiter-of-ash",
      "step-t11-park",
      "step-doryani-revival",
      "step-delirium-part1",
      "step-abyss-breach",
      "step-level85-ascendancy",
      "step-find-halls",
      "step-kill-divinity",
      "step-cardinal-device",
      "step-memory-forks",
      "step-repeat-divinity-loop",
      "step-close-out-tree",
      "step-juiced-loop",
    ]) {
      expect(stepIds.has(id), id).toBe(true);
    }
  });

  it("keep the original action items in place on existing steps", () => {
    const sustain = roadmapSteps.find((s) => s.id === "step-sustain-cluster")!;
    expect(sustain.actionItems?.slice(0, 9)).toEqual([
      "Trapped Subordinate",
      "Pathkeepers",
      "Eons of Domination",
      "Valuable Paths",
      "The Chosen Path: Essences",
      "The Journey Ahead: Effectiveness",
      "Archaeological Interest",
      "Expanding Hordes",
      "Atop the World",
    ]);
    const forks = roadmapSteps.find((s) => s.id === "step-memory-forks")!;
    expect(forks.actionItems?.[0]).toMatch(/^Top-left fork/);
    expect(forks.actionItems?.[2]).toMatch(/^Top fork/);
  });
});

describe("references", () => {
  it("every step's gate and mistake ids resolve", () => {
    const gateIds = new Set(benchmarkGates.map((g) => g.id));
    const mistakeIds = new Set(commonMistakes.map((m) => m.id));
    for (const step of roadmapSteps) {
      for (const id of step.benchmarkGateIds ?? []) expect(gateIds.has(id), `${step.id} → ${id}`).toBe(true);
      for (const id of step.relatedMistakeIds ?? []) expect(mistakeIds.has(id), `${step.id} → ${id}`).toBe(true);
    }
  });

  it("gates, the planner and the glossary only point at real steps", () => {
    for (const g of benchmarkGates) {
      if (g.appliesBeforeStepId) expect(stepIds.has(g.appliesBeforeStepId), g.id).toBe(true);
    }
    for (const g of WAYSTONE_GATES) expect(stepIds.has(g.stepId), `T${g.tier}`).toBe(true);
    for (const g of glossary) {
      if (g.seeStepId) expect(stepIds.has(g.seeStepId), g.id).toBe(true);
    }
  });

  it("every step belongs to a rendered phase", () => {
    for (const step of roadmapSteps) expect(PHASE_ORDER).toContain(step.phase);
  });
});

describe("sources", () => {
  it("never shows a web-digest-only claim as confirmed", () => {
    for (const [id, source] of allSources) {
      if (source.sourceDoc === "community-digest-0.5.5") {
        expect(source.verified, id).not.toBe("confirmed");
      }
    }
  });

  it("every video citation parses into a timestamped link", () => {
    for (const [id, source] of allSources) {
      for (const c of source.citations ?? []) {
        expect(citationUrl(c), `${id}: ${c}`).not.toBeNull();
      }
    }
  });

  it("video-sourced records carry at least one citation", () => {
    for (const [id, source] of allSources) {
      if (source.sourceDoc.startsWith("creator-videos")) {
        expect(source.citations?.length ?? 0, id).toBeGreaterThan(0);
      }
    }
  });
});

describe("strategies", () => {
  it("ranks are unique", () => {
    expectUnique(farmingStrategies.map((s) => String(s.rank)));
  });

  it("tiered strategies rank above untiered ones, best tier first", () => {
    const order = { S: 0, A: 1, B: 2, C: 3 } as const;
    const sorted = [...farmingStrategies].sort((a, b) => a.rank - b.rank);
    let last = -1;
    for (const s of sorted) {
      const t = s.tier ? order[s.tier] : 4;
      expect(t, s.id).toBeGreaterThanOrEqual(last);
      last = t;
    }
  });
});

describe("citationUrl", () => {
  it("converts mm:ss and ranges to seconds", () => {
    expect(citationUrl("uMHfOL8sT6I@05:20")).toEqual({
      href: "https://youtu.be/uMHfOL8sT6I?t=320",
      label: "05:20",
    });
    expect(citationUrl("-R5KjDJQu9w@08:19–09:04")?.href).toBe("https://youtu.be/-R5KjDJQu9w?t=499");
    expect(citationUrl("abc@1:02:03")?.href).toBe("https://youtu.be/abc?t=3723");
    expect(citationUrl("no-timestamp")).toBeNull();
  });
});
