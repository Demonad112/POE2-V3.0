"use client";

import { ROADMAP_PHASE_LABELS } from "@/lib/constants";
import { phaseAnchor, stepsByPhase } from "@/lib/roadmapOrder";
import { useChecklistState } from "@/hooks/useChecklistState";

/** Sticky phase jump bar with per-phase counts and the hide-completed toggle. */
export function ChecklistPhaseNav() {
  const { completedStepIds, hideCompleted, setHideCompleted } = useChecklistState();
  const done = new Set(completedStepIds);
  const firstOpen = stepsByPhase.find((g) => g.steps.some((s) => !done.has(s.id)))?.phase;

  return (
    <nav
      aria-label="Checklist phases"
      className="sticky top-14 z-10 -mx-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-[var(--surface)]/90 px-2 py-2 backdrop-blur-md"
    >
      {stepsByPhase.map(({ phase, steps }, i) => {
        const count = steps.filter((s) => done.has(s.id)).length;
        const complete = count === steps.length;
        const current = phase === firstOpen;
        return (
          <a
            key={phase}
            href={`#${phaseAnchor(phase)}`}
            title={ROADMAP_PHASE_LABELS[phase]}
            className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
              complete
                ? "border-good/30 bg-good/10 text-[var(--good)]"
                : current
                  ? "border-[var(--accent)]/50 bg-[var(--accent-dim)] text-[var(--accent)]"
                  : "border-line text-ink-mute hover:text-ink-dim"
            }`}
          >
            <span className="font-mono">{complete ? "✓" : i + 1}</span>
            <span className="hidden max-w-[9rem] truncate md:inline">
              {(ROADMAP_PHASE_LABELS[phase] ?? phase).split(" — ")[0]}
            </span>
            <span className="font-mono text-[10px] opacity-80">
              {count}/{steps.length}
            </span>
          </a>
        );
      })}
      <label className="ml-auto flex cursor-pointer items-center gap-1.5 px-1 text-xs text-ink-mute">
        <input
          type="checkbox"
          checked={hideCompleted}
          onChange={(e) => setHideCompleted(e.target.checked)}
          className="size-3.5 accent-emerald-500"
        />
        Hide completed
      </label>
    </nav>
  );
}
