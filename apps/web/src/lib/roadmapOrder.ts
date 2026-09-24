import { roadmapSteps } from "@/data/roadmap";
import type { RoadmapPhase, RoadmapStep } from "./types";

/** Checklist phases in play order. */
export const PHASE_ORDER: RoadmapPhase[] = [
  "campaign-end",
  "precursor-fortress",
  "arbiter-of-ash",
  "t11-checkpoint",
  "arbiter-of-divinity-loop",
  "full-tree",
  "masters-and-mechanics",
  "juiced-farming",
];

export function phaseAnchor(phase: RoadmapPhase): string {
  return `phase-${phase}`;
}

/** Every step, in the order a player meets them. */
export const orderedSteps: RoadmapStep[] = PHASE_ORDER.flatMap((phase) =>
  roadmapSteps
    .filter((step) => step.phase === phase)
    .sort((a, b) => a.order - b.order)
);

export const stepsByPhase = PHASE_ORDER.map((phase) => ({
  phase,
  steps: orderedSteps.filter((step) => step.phase === phase),
})).filter((group) => group.steps.length > 0);

/** The first step not yet ticked off, or null when the checklist is done. */
export function nextIncompleteStep(
  completedStepIds: readonly string[]
): RoadmapStep | null {
  const done = new Set(completedStepIds);
  return orderedSteps.find((step) => !done.has(step.id)) ?? null;
}
