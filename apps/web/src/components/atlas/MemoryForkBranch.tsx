"use client";

import type { MemoryFork } from "@/lib/types";
import { SourceFlag } from "@/components/shared/SourceFlag";
import { useAtlasProgress } from "@/hooks/useAtlasProgress";
import { ShowOnTreeButton } from "./AtlasMapContext";

export function MemoryForkBranch({ fork }: { fork: MemoryFork }) {
  const { isForkAllocated, toggleFork } = useAtlasProgress();
  const allocated = isForkAllocated(fork.id);

  return (
    <div
      id={fork.id}
      className={`scroll-mt-40 flex-1 rounded-lg border p-3.5 transition-colors ${
        allocated ? "border-good/30 bg-good/5" : "card hover:border-line-strong"
      }`}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={allocated}
          onChange={() => toggleFork(fork.id)}
          aria-label={`Allocated ${fork.title}`}
          className="size-4 accent-emerald-500"
        />
        <h4 className="font-semibold text-ink">{fork.title}</h4>
        <SourceFlag source={fork.source} />
        <span className="ml-auto">
          <ShowOnTreeButton names={fork.treeNodes} label={fork.title} />
        </span>
      </div>
      <ul className="mt-2 ml-6 list-disc space-y-0.5 text-sm text-ink-dim marker:text-accent">
        {fork.nodes.map((node) => (
          <li key={node}>{node}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-mute">{fork.description}</p>
    </div>
  );
}
