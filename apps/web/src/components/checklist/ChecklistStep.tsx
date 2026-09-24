"use client";

import type { BenchmarkGate as BenchmarkGateType, RoadmapStep } from "@/lib/types";
import { BenchmarkGate } from "@/components/shared/BenchmarkGate";
import { SourceFlag } from "@/components/shared/SourceFlag";
import { actionItemKey, useChecklistState } from "@/hooks/useChecklistState";
import { commonMistakes } from "@/data/commonMistakes";

export function ChecklistStep({
  step,
  gates,
}: {
  step: RoadmapStep;
  gates: BenchmarkGateType[];
}) {
  const {
    isStepComplete,
    toggleStep,
    isActionItemComplete,
    toggleActionItem,
    hideCompleted,
  } = useChecklistState();
  const complete = isStepComplete(step.id);
  const avoid = commonMistakes.filter((m) => step.relatedMistakeIds?.includes(m.id));

  if (complete && hideCompleted) return null;

  return (
    <li
      id={step.id}
      className={`scroll-mt-24 rounded-lg border p-4 transition-all ${
        complete
          ? "border-good/30 bg-good/5"
          : "border-[var(--line)] bg-[var(--surface-raised)] hover:border-line"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={complete}
          onChange={() => toggleStep(step.id)}
          className="mt-1 size-4 accent-emerald-500"
        />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-ink-mute">
              #{step.order}
            </span>
            <h3
              className={`font-medium ${complete ? "text-ink-mute line-through" : "text-ink"}`}
            >
              {step.title}
            </h3>
            <SourceFlag source={step.source} />
          </div>
          <p className="mt-1 text-sm text-ink-mute">{step.description}</p>
        </div>
      </label>

      {step.tips && step.tips.length > 0 && (
        <ul className="mt-2 ml-7 list-disc space-y-1 pl-4 text-xs text-ink-mute marker:text-[var(--accent)]">
          {step.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}

      {step.actionItems && step.actionItems.length > 0 && (
        <ul className="mt-3 ml-7 space-y-1 border-l border-line pl-3">
          {step.actionItems.map((item, index) => {
            const key = actionItemKey(step.id, index);
            const done = isActionItemComplete(key);
            return (
              <li key={key}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => toggleActionItem(key)}
                    className="mt-0.5 size-3.5 accent-emerald-500"
                  />
                  <span className={done ? "text-ink-mute line-through" : "text-ink-dim"}>
                    {item}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {avoid.length > 0 && (
        <div className="mt-3 ml-7 space-y-1">
          {avoid.map((m) => (
            <details
              key={m.id}
              className="group rounded-md border border-danger/20 bg-danger/[0.05] px-2.5 py-1.5 text-xs"
            >
              <summary className="cursor-pointer list-none text-[var(--danger)] [&::-webkit-details-marker]:hidden">
                <span aria-hidden>⚠ </span>
                <span className="font-semibold">Avoid:</span> {m.title}
                <span className="ml-1 text-ink-mute group-open:hidden">(why?)</span>
              </summary>
              <p className="mt-1 text-danger/80">{m.description}</p>
            </details>
          ))}
        </div>
      )}

      {gates.length > 0 && (
        <div className="mt-3 space-y-2">
          {gates.map((gate) => (
            <BenchmarkGate key={gate.id} gate={gate} />
          ))}
        </div>
      )}
    </li>
  );
}
