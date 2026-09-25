"use client";

import { ProgressBar } from "@/components/shared/ProgressBar";
import { useAtlasProgress } from "@/hooks/useAtlasProgress";

export function AtlasSequenceTracker() {
  const { allocationPercent } = useAtlasProgress();

  return (
    <div className="rounded-lg card p-4">
      <ProgressBar percent={allocationPercent} label="Tracked clusters allocated" />
    </div>
  );
}
