"use client";

import { atlasTrapNodes } from "@/data/trapNodes";
import { SourceFlag } from "@/components/shared/SourceFlag";
import { ShowOnTreeButton } from "./AtlasMapContext";

const SEVERITY_STYLES: Record<string, string> = {
  avoid: "border-danger/40 bg-danger/10 text-danger",
  situational: "border-warn/40 bg-warn/10 text-warn",
  optional: "border-line bg-surface-sunken text-ink-mute",
};

const GROUP_LABELS: Record<number, string> = {
  1: "Group 1 · hard avoid",
  2: "Group 2 · bugged or situational",
  3: "Group 3 · extreme boss scaling",
};

const sortedTraps = [...atlasTrapNodes].sort((a, b) => (a.group ?? 9) - (b.group ?? 9));

/**
 * Nodes that hurt more than they help. One line each — name, severity, what
 * it touches and when to skip it — with the full reason a tap away.
 */
export function TrapNodePanel() {
  const hardAvoid = atlasTrapNodes.filter((n) => n.severity === "avoid").length;
  return (
    <div id="atlas-trap-nodes" className="scroll-mt-40">
      <p className="mb-2.5 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-ink-dim">
        <span className="font-semibold text-danger">Do not allocate.</span> The Atlas tree can&apos;t be respecced
        (only Multi-Choice nodes toggle), so a wrong point is permanent. {hardAvoid} to always avoid,{" "}
        {atlasTrapNodes.length} in total — tap one for why. To find them in-game, paste a search string from{" "}
        <a href="#atlas-regex" className="text-accent underline-offset-2 hover:underline">
          Search strings
        </a>
        .
      </p>
      <ul className="space-y-1.5">
        {sortedTraps.map((trap, i) => (
          <li key={trap.id} id={trap.id} className="scroll-mt-40">
            {trap.group && trap.group !== sortedTraps[i - 1]?.group ? (
              <h4 className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-ink-mute">
                {GROUP_LABELS[trap.group]}
              </h4>
            ) : null}
            <details className="group rounded-lg border border-line bg-surface-raised shadow-[var(--lift)] open:border-line-strong">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                <span
                  className={`rounded border px-1.5 py-px text-[10px] font-semibold uppercase ${SEVERITY_STYLES[trap.severity]}`}
                >
                  {trap.severity}
                </span>
                <span className="text-sm font-medium text-ink">{trap.node}</span>
                <span className="text-xs text-ink-mute">{trap.affects}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <ShowOnTreeButton names={trap.treeNodes} label={trap.node} />
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="size-3.5 text-ink-mute transition-transform group-open:rotate-90"
                  >
                    <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="basis-full text-xs text-ink-dim">
                  <span className="text-ink-mute">Skip if:</span> {trap.avoidIf}
                </span>
              </summary>
              <div className="border-t border-line px-3 py-2.5 text-xs leading-relaxed text-ink-dim">
                <p>{trap.problem}</p>
                <div className="mt-1.5">
                  <SourceFlag source={trap.source} />
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
