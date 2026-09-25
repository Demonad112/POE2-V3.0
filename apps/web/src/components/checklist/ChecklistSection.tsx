"use client";

/**
 * One phase of the roadmap as a collapsible block: name, how many steps are
 * done, a thin progress bar. Only the phase holding the next step opens by
 * default. The <details> carries the phase anchor, so the phase nav's links
 * open it (HashHighlight opens any <details> it targets).
 */

import type { BenchmarkGate, RoadmapPhase, RoadmapStep } from "@/lib/types";
import { ROADMAP_PHASE_LABELS } from "@/lib/constants";
import { nextIncompleteStep, phaseAnchor } from "@/lib/roadmapOrder";
import { useChecklistState } from "@/hooks/useChecklistState";
import { ChecklistStep } from "./ChecklistStep";

export function ChecklistSection({
  phase,
  steps,
  benchmarkGates,
  index,
}: {
  phase: RoadmapPhase;
  steps: RoadmapStep[];
  benchmarkGates: BenchmarkGate[];
  index: number;
}) {
  const { completedStepIds } = useChecklistState();
  const done = steps.filter((s) => completedStepIds.includes(s.id)).length;
  const next = nextIncompleteStep(completedStepIds);
  const current = next?.phase === phase;
  const complete = done === steps.length;
  const percent = steps.length ? Math.round((done / steps.length) * 100) : 0;

  return (
    <details id={phaseAnchor(phase)} open={current} className="group/phase scroll-mt-32">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-line bg-surface-raised/60 px-3.5 py-3 transition-colors hover:border-line-strong group-open/phase:border-accent-line/70 [&::-webkit-details-marker]:hidden">
        <span
          className={`tabular flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
            complete
              ? "border-good/40 bg-good/10 text-good"
              : current
                ? "border-accent-line bg-accent-soft text-accent"
                : "border-line text-ink-mute"
          }`}
        >
          {complete ? "✓" : index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink">{ROADMAP_PHASE_LABELS[phase] ?? phase}</span>
          <span className="mt-1.5 flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-sunken">
              <span
                className={`block h-full rounded-full ${complete ? "bg-good" : "bg-accent"}`}
                style={{ width: `${percent}%` }}
              />
            </span>
            <span className="tabular shrink-0 text-[11px] text-ink-mute">
              {done}/{steps.length}
            </span>
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className="size-4 shrink-0 text-ink-mute transition-transform group-open/phase:rotate-90"
        >
          <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <ul className="mt-2 space-y-1.5 pl-0 sm:pl-3">
        {steps.map((step) => (
          <ChecklistStep
            key={step.id}
            step={step}
            isNext={next?.id === step.id}
            gates={benchmarkGates.filter((g) => step.benchmarkGateIds?.includes(g.id))}
          />
        ))}
      </ul>
    </details>
  );
}
