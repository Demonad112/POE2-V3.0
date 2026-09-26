import { describe, expect, it } from "vitest";
import { orderedSteps } from "@/lib/roadmapOrder";
import { progressTotals, stepSummaries } from "@/lib/stepSummary";
import { atlasClusters, memoryForks } from "@/data/atlasTree";

describe("stepSummaries", () => {
  it("keeps every step, in play order, with the same action items", () => {
    // Action-item progress is stored by `stepId::index`, so the home card must
    // see exactly the ids and item order the checklist does.
    const summaries = stepSummaries();
    expect(summaries.map((s) => s.id)).toEqual(orderedSteps.map((s) => s.id));
    summaries.forEach((s, i) => expect(s.actionItems).toEqual(orderedSteps[i]!.actionItems ?? []));
  });

  it("resolves every gate and mistake a step names", () => {
    const summaries = stepSummaries();
    orderedSteps.forEach((step, i) => {
      expect(summaries[i]!.gates.map((g) => g.id).sort()).toEqual([...(step.benchmarkGateIds ?? [])].sort());
      expect(summaries[i]!.avoid.map((m) => m.id).sort()).toEqual([...(step.relatedMistakeIds ?? [])].sort());
    });
  });

  it("counts the same Atlas total the Atlas progress hook does", () => {
    expect(progressTotals().atlasTotal).toBe(atlasClusters.length + memoryForks.length);
  });
});
