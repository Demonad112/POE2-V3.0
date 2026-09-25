"use client";

/**
 * One roadmap step, collapsed to a single line until opened: checkbox, title,
 * and what's inside (action items done, warnings, a benchmark gate). The next
 * step to do opens by default; a completed step closes itself.
 *
 * The <details> carries the step id, so deep links ("Jump to step", search)
 * open it — HashHighlight opens any <details> it targets. Progress keys are
 * unchanged: step id, and `${stepId}::${index}` per action item.
 */

import type { BenchmarkGate as BenchmarkGateType, RoadmapStep } from "@/lib/types";
import { BenchmarkGate } from "@/components/shared/BenchmarkGate";
import { SourceFlag } from "@/components/shared/SourceFlag";
import { actionItemKey, useChecklistState } from "@/hooks/useChecklistState";
import { commonMistakes } from "@/data/commonMistakes";

export function ChecklistStep({
  step,
  gates,
  isNext,
}: {
  step: RoadmapStep;
  gates: BenchmarkGateType[];
  /** The first incomplete step of the checklist — opened by default. */
  isNext: boolean;
}) {
  const { isStepComplete, toggleStep, isActionItemComplete, toggleActionItem, hideCompleted } = useChecklistState();
  const complete = isStepComplete(step.id);
  const avoid = commonMistakes.filter((m) => step.relatedMistakeIds?.includes(m.id));
  const items = step.actionItems ?? [];
  const itemsDone = items.filter((_, i) => isActionItemComplete(actionItemKey(step.id, i))).length;

  if (complete && hideCompleted) return null;

  return (
    <li>
      <details
        id={step.id}
        open={isNext && !complete}
        className={`group scroll-mt-40 rounded-lg border transition-colors ${
          complete
            ? "border-good/25 bg-good/[0.04]"
            : isNext
              ? "border-accent-line bg-surface-raised shadow-[var(--lift)]"
              : "border-line bg-surface-raised shadow-[var(--lift)] hover:border-line-strong"
        }`}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          <input
            type="checkbox"
            checked={complete}
            onChange={() => toggleStep(step.id)}
            aria-label={`Done: ${step.title}`}
            className="size-4 shrink-0 accent-emerald-500"
          />
          <span className="tabular w-6 shrink-0 text-[11px] text-ink-mute">#{step.order}</span>
          <span
            className={`min-w-0 flex-1 text-sm font-medium ${complete ? "text-ink-mute line-through" : "text-ink"}`}
          >
            {step.title}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {items.length ? (
              <span
                className={`tabular rounded px-1.5 py-px text-[10px] ${
                  itemsDone === items.length ? "bg-good/10 text-good" : "bg-surface-sunken text-ink-mute"
                }`}
                title="Action items done"
              >
                {itemsDone}/{items.length}
              </span>
            ) : null}
            {avoid.length ? (
              <span className="rounded bg-danger/10 px-1.5 py-px text-[10px] text-danger" title="Mistakes to avoid">
                ⚠ {avoid.length}
              </span>
            ) : null}
            {gates.length ? (
              <span className="rounded bg-accent-soft px-1.5 py-px text-[10px] text-accent" title="Readiness gate">
                gate
              </span>
            ) : null}
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="size-3.5 text-ink-mute transition-transform group-open:rotate-90"
            >
              <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </summary>

        <div className="space-y-3 border-t border-line px-3 pt-3 pb-3.5 sm:pl-[4.25rem]">
          <p className="text-sm leading-relaxed text-ink-dim">{step.description}</p>
          <div className="flex flex-wrap items-center gap-1.5 empty:hidden">
            <SourceFlag source={step.source} />
          </div>

          {step.tips && step.tips.length > 0 ? (
            <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-mute marker:text-accent">
              {step.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          ) : null}

          {items.length ? (
            <ul className="space-y-1.5 border-l border-line pl-3">
              {items.map((item, index) => {
                const key = actionItemKey(step.id, index);
                const done = isActionItemComplete(key);
                return (
                  <li key={key}>
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggleActionItem(key)}
                        className="mt-0.5 size-3.5 shrink-0 accent-emerald-500"
                      />
                      <span className={done ? "text-ink-mute line-through" : "text-ink-dim"}>{item}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {avoid.length ? (
            <ul className="overflow-hidden rounded-md border border-line">
              {avoid.map((m) => (
                <li key={m.id} className="border-b border-line last:border-b-0">
                  <details className="group/avoid">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5 text-xs text-ink-dim [&::-webkit-details-marker]:hidden">
                      <span aria-hidden className="text-danger">
                        ⚠
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-ink-mute">Avoid:</span> {m.title}
                      </span>
                      <span className="text-[10px] text-ink-mute group-open/avoid:hidden">why?</span>
                    </summary>
                    <p className="px-2.5 pb-2 pl-7 text-xs leading-relaxed text-ink-mute">{m.description}</p>
                  </details>
                </li>
              ))}
            </ul>
          ) : null}

          {gates.length ? (
            <div className="space-y-2">
              {gates.map((gate) => (
                <BenchmarkGate key={gate.id} gate={gate} />
              ))}
            </div>
          ) : null}
        </div>
      </details>
    </li>
  );
}
