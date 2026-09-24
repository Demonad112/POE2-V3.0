import type { BenchmarkGate, RoadmapPhase, RoadmapStep } from "@/lib/types";
import { ROADMAP_PHASE_LABELS } from "@/lib/constants";
import { phaseAnchor } from "@/lib/roadmapOrder";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { ChecklistStep } from "./ChecklistStep";

export function ChecklistSection({
  phase,
  steps,
  benchmarkGates,
}: {
  phase: RoadmapPhase;
  steps: RoadmapStep[];
  benchmarkGates: BenchmarkGate[];
}) {
  return (
    <section id={phaseAnchor(phase)} className="scroll-mt-28">
      <SectionTitle>{ROADMAP_PHASE_LABELS[phase] ?? phase}</SectionTitle>
      <ul className="space-y-3">
        {steps.map((step) => (
          <ChecklistStep
            key={step.id}
            step={step}
            gates={benchmarkGates.filter((g) =>
              step.benchmarkGateIds?.includes(g.id)
            )}
          />
        ))}
      </ul>
    </section>
  );
}
