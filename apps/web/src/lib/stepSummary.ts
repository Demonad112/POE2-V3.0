import { benchmarkGates } from "@/data/benchmarks";
import { commonMistakes } from "@/data/commonMistakes";
import { atlasClusters, memoryForks } from "@/data/atlasTree";
import { ROADMAP_PHASE_LABELS } from "@/lib/constants";
import { orderedSteps } from "@/lib/roadmapOrder";

/**
 * Just what "Up next" and the progress cards render, derived from the guide
 * data at build time by the server components that use it. Passing this as
 * props keeps the full roadmap, Atlas and mistake data out of the client
 * bundle of pages that only ever show one step of it — and since it is derived,
 * not hand-copied, it cannot drift from the guide.
 */
export interface StepSummary {
  id: string;
  phaseLabel: string;
  title: string;
  description: string;
  actionItems: string[];
  gates: { id: string; label: string; hard: boolean }[];
  avoid: { id: string; title: string }[];
}

export function stepSummaries(): StepSummary[] {
  return orderedSteps.map((step) => ({
    id: step.id,
    phaseLabel: ROADMAP_PHASE_LABELS[step.phase] ?? step.phase,
    title: step.title,
    description: step.description,
    actionItems: step.actionItems ?? [],
    gates: benchmarkGates
      .filter((g) => step.benchmarkGateIds?.includes(g.id))
      .map((g) => ({ id: g.id, label: g.label, hard: g.severity === "hard-gate" })),
    avoid: commonMistakes
      .filter((m) => step.relatedMistakeIds?.includes(m.id))
      .map((m) => ({ id: m.id, title: m.title })),
  }));
}

/** Totals the home progress card divides by. */
export function progressTotals() {
  return {
    stepIds: orderedSteps.map((s) => s.id),
    atlasTotal: atlasClusters.length + memoryForks.length,
  };
}
