"use client";

/**
 * The Atlas guide, one section at a time: Path · Forks · Mechanics · Late game
 * · Traps. On a phone the old single column was ~7,800px of scrolling; a tab
 * bar keeps each part a screen or two long.
 *
 * Deep links still work: a hash naming a cluster, fork or trap node opens the
 * tab that holds it, then scrolls to it.
 */

import { Suspense, useEffect, useState } from "react";
import { atlasClusters, memoryForks } from "@/data/atlasTree";
import { atlasTrapNodes } from "@/data/trapNodes";
import type { Mechanic } from "@/lib/types";
import { useAtlasProgress } from "@/hooks/useAtlasProgress";
import { ClusterNode } from "./ClusterNode";
import { MemoryForkBranch } from "./MemoryForkBranch";
import { MechanicSubTreeList } from "./MechanicSubTreeList";
import { TrapNodePanel } from "./TrapNodePanel";

type TabId = "path" | "forks" | "mechanics" | "late" | "traps";

const TABS: { id: TabId; label: string }[] = [
  { id: "path", label: "Path" },
  { id: "forks", label: "Memory forks" },
  { id: "mechanics", label: "Mechanics" },
  { id: "late", label: "Late game" },
  { id: "traps", label: "Traps" },
];

const early = atlasClusters.filter((c) => c.group === "early-progression").sort((a, b) => a.order - b.order);
const general = atlasClusters.filter((c) => c.group === "general").sort((a, b) => a.order - b.order);

/** Which tab (and mechanic) holds an element id. */
function locate(id: string): { tab: TabId; mechanic?: Mechanic } | null {
  if (id === "atlas-trap-nodes" || atlasTrapNodes.some((t) => t.id === id)) return { tab: "traps" };
  if (memoryForks.some((f) => f.id === id)) return { tab: "forks" };
  const cluster = atlasClusters.find((c) => c.id === id);
  if (!cluster) return null;
  if (cluster.group === "early-progression") return { tab: "path" };
  if (cluster.group === "general") return { tab: "late" };
  return { tab: "mechanics", ...(cluster.mechanic ? { mechanic: cluster.mechanic } : {}) };
}

function Intro({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-ink-dim">{children}</p>;
}

export function AtlasGuideTabs() {
  const [tab, setTab] = useState<TabId>("path");
  const [mechanic, setMechanic] = useState<Mechanic | undefined>(undefined);
  const { isClusterAllocated, isForkAllocated } = useAtlasProgress();

  useEffect(() => {
    const sync = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const found = id ? locate(id) : null;
      if (!found) return;
      setTab(found.tab);
      if (found.mechanic) setMechanic(found.mechanic);
      // After the tab renders, bring the target into view.
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "center" }));
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const count = (id: TabId): string | null => {
    if (id === "path") return `${early.filter((c) => isClusterAllocated(c.id)).length}/${early.length}`;
    if (id === "late") return `${general.filter((c) => isClusterAllocated(c.id)).length}/${general.length}`;
    if (id === "forks") return `${memoryForks.filter((f) => isForkAllocated(f.id)).length}/${memoryForks.length}`;
    if (id === "traps") return String(atlasTrapNodes.length);
    return null;
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Atlas guide sections"
        className="sticky top-14 z-10 -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-line bg-surface/85 px-4 py-2 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:px-1.5 sm:py-1.5"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          const n = count(t.id);
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-accent-soft text-ink ring-1 ring-accent-line" : "text-ink-mute hover:bg-surface-raised hover:text-ink"
              }`}
            >
              {t.label}
              {n ? (
                <span className={`tabular text-[10px] ${active ? "text-accent" : "text-ink-mute"}`}>{n}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {tab === "path" ? (
          <>
            <Intro>
              Main-path allocation order, before and after the Arbiter of Ash and Divinity kills. The numbers are the
              order to take them in — tap <span className="text-accent">Map</span> to see where each one is.
            </Intro>
            <ul className="grid gap-2 lg:grid-cols-2">
              {early.map((c) => (
                <ClusterNode key={c.id} cluster={c} />
              ))}
            </ul>
          </>
        ) : null}

        {tab === "forks" ? (
          <>
            <Intro>
              Unlocked after the first Arbiter of Divinity kill. Three parallel branches — take whichever fits your
              farming loop first.
            </Intro>
            <div className="flex flex-col gap-2.5 md:flex-row">
              {memoryForks.map((fork) => (
                <MemoryForkBranch key={fork.id} fork={fork} />
              ))}
            </div>
          </>
        ) : null}

        {tab === "mechanics" ? (
          <>
            <Intro>Commit to one mechanic at a time — the payoff nodes sit deep in each sub-tree.</Intro>
            <Suspense fallback={null}>
              <MechanicSubTreeList clusters={atlasClusters} {...(mechanic ? { initial: mechanic } : {})} />
            </Suspense>
          </>
        ) : null}

        {tab === "late" ? (
          <>
            <Intro>Once the main path is done: where the rest of your points go.</Intro>
            <ul className="grid gap-2 lg:grid-cols-2">
              {general.map((c) => (
                <ClusterNode key={c.id} cluster={c} />
              ))}
            </ul>
          </>
        ) : null}

        {tab === "traps" ? <TrapNodePanel /> : null}
      </div>
    </div>
  );
}
