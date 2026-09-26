"use client";

import Link from "next/link";
import { usePersistedState } from "@/hooks/usePersistedState";
import { ProgressBar } from "@/components/shared/ProgressBar";

const percent = (done: number, total: number) =>
  total === 0 ? 0 : Math.round((done / total) * 100);

/**
 * Totals come in as props (see `progressTotals`) rather than from the progress
 * hooks, which import the full guide data to count it.
 */
export function ProgressSummary({ stepIds, atlasTotal }: { stepIds: string[]; atlasTotal: number }) {
  const { state } = usePersistedState();
  const { completedStepIds } = state.checklist;
  const { allocatedClusterIds, allocatedForkIds } = state.atlas;
  // Count only ids that still exist, as the checklist does.
  const completionPercent = percent(
    stepIds.filter((id) => completedStepIds.includes(id)).length,
    stepIds.length
  );
  const allocationPercent = percent(
    allocatedClusterIds.length + allocatedForkIds.length,
    atlasTotal
  );
  const started = completionPercent > 0 || allocationPercent > 0;

  return (
    <div className="rounded-xl card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-ink">
          {started ? "Your progress" : "Track your progress"}
        </h2>
        <span className="text-xs text-ink-mute">Saved in this browser</span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <ProgressBar percent={completionPercent} label="Checklist" />
          <Link
            href="/checklist"
            className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
          >
            {completionPercent > 0 ? "Continue checklist" : "Start checklist"} →
          </Link>
        </div>
        <div>
          <ProgressBar percent={allocationPercent} label="Atlas allocation" />
          <Link
            href="/atlas"
            className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
          >
            {allocationPercent > 0 ? "Continue planning" : "Start planning"} →
          </Link>
        </div>
      </div>
    </div>
  );
}
