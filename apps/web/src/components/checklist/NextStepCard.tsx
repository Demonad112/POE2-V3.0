"use client";

import Link from "next/link";
import type { StepSummary } from "@/lib/stepSummary";
import { actionItemKey, useChecklistActions } from "@/hooks/useChecklistActions";

/**
 * "What do I do now?" — the first unticked step, with its remaining sub-steps
 * checkable in place. On the checklist it links down to the step; elsewhere it
 * links to the checklist.
 */
export function NextStepCard({
  steps,
  onChecklistPage = false,
}: {
  /** Every step in play order, from `stepSummaries()`. */
  steps: StepSummary[];
  onChecklistPage?: boolean;
}) {
  const { completedStepIds, toggleStep, isActionItemComplete, toggleActionItem } =
    useChecklistActions();
  const done = new Set(completedStepIds);
  const step = steps.find((s) => !done.has(s.id)) ?? null;
  const doneCount = steps.filter((s) => done.has(s.id)).length;

  if (!step) {
    return (
      <div className="rounded-xl border border-good/30 bg-good/5 p-5">
        <h2 className="font-semibold text-ink">Checklist complete</h2>
        <p className="mt-1 text-sm text-ink-mute">
          Every step is ticked off. Pick a farm on the{" "}
          <Link href="/dashboard" className="text-[var(--accent)] hover:underline">
            dashboard
          </Link>{" "}
          and keep your Atlas allocation up to date.
        </p>
      </div>
    );
  }

  const position = steps.indexOf(step) + 1;
  const { gates, avoid } = step;
  const href = onChecklistPage ? `#${step.id}` : `/checklist#${step.id}`;

  return (
    <section
      aria-labelledby="next-step-title"
      className="relative overflow-hidden rounded-xl border border-[var(--accent)]/35 bg-[var(--surface-raised)] p-5 shadow-[0_8px_30px_-12px_rgba(227,179,65,0.35)]"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[var(--accent)]" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-[var(--accent)] uppercase">
          Up next · {step.phaseLabel}
        </span>
        <span className="text-xs text-ink-mute">
          Step {position} of {steps.length} · {doneCount} done
        </span>
      </div>

      <h2 id="next-step-title" className="mt-2 text-lg font-semibold text-ink">
        {step.title}
      </h2>
      <p className="mt-1 text-sm text-ink-dim">{step.description}</p>

      {step.actionItems.length > 0 && (
        <ul className="mt-3 space-y-1">
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

      {(gates.length > 0 || avoid.length > 0) && (
        <ul className="mt-3 space-y-1 text-xs">
          {gates.map((g) => (
            <li key={g.id} className="text-[var(--warn)]">
              <span className="font-semibold">
                {g.hard ? "Gate:" : "Guideline:"}
              </span>{" "}
              {g.label}
            </li>
          ))}
          {avoid.map((m) => (
            <li key={m.id} className="text-[var(--danger)]">
              <span className="font-semibold">Avoid:</span> {m.title}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => toggleStep(step.id)}
          className="rounded-md border border-good/40 bg-good/10 px-3 py-1.5 text-sm font-medium text-[var(--good)] transition-colors hover:bg-good/20"
        >
          ✓ Mark done
        </button>
        <Link
          href={href}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-dim transition-colors hover:border-[var(--accent)]/40 hover:text-ink"
        >
          {onChecklistPage ? "Jump to step" : "Open in checklist"} →
        </Link>
      </div>
    </section>
  );
}
