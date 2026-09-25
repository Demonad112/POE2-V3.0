"use client";

import { useState } from "react";
import type { AtlasCluster } from "@/lib/types";
import { SourceFlag } from "@/components/shared/SourceFlag";
import { useAtlasProgress } from "@/hooks/useAtlasProgress";
import { ShowOnTreeButton } from "./AtlasMapContext";

/** Descriptions longer than this are clamped to two lines until expanded. */
const LONG = 120;

export function ClusterNode({ cluster }: { cluster: AtlasCluster }) {
  const { isClusterAllocated, toggleCluster } = useAtlasProgress();
  const allocated = isClusterAllocated(cluster.id);
  const [expanded, setExpanded] = useState(false);
  const long = cluster.description.length > LONG;

  return (
    <li
      id={cluster.id}
      className={`scroll-mt-40 rounded-lg border px-3 py-2.5 transition-colors ${
        allocated
          ? "border-good/30 bg-good/5"
          : "border-line bg-surface-raised shadow-[var(--lift)] hover:border-line-strong"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={allocated}
          onChange={() => toggleCluster(cluster.id)}
          aria-label={`Allocated ${cluster.name}`}
          className="mt-0.5 size-4 shrink-0 accent-emerald-500"
        />
        <span className="tabular mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-[10px] text-ink-mute">
          {cluster.order}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`text-sm font-medium ${allocated ? "text-ink-mute line-through" : "text-ink"}`}>
              {cluster.name}
            </span>
            {cluster.killGated ? (
              <span className="rounded border border-line px-1.5 py-px text-[10px] text-ink-mute">kill-gated</span>
            ) : null}
            <SourceFlag source={cluster.source} />
          </div>
          <p className={`mt-1 text-xs leading-relaxed text-ink-dim ${long && !expanded ? "line-clamp-2" : ""}`}>
            {cluster.description}
          </p>
          {long ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 text-[11px] text-accent hover:underline"
            >
              {expanded ? "Less" : "More"}
            </button>
          ) : null}
        </div>
        <ShowOnTreeButton names={cluster.treeNodes} label={cluster.name} />
      </div>
    </li>
  );
}
