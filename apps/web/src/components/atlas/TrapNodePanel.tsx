"use client";

import { atlasTrapNodes } from "@/data/trapNodes";
import { SourceFlag } from "@/components/shared/SourceFlag";
import { ShowOnTreeButton } from "./AtlasMapContext";

const SEVERITY_STYLES: Record<string, string> = {
  avoid: "border-danger/40 bg-danger/10 text-danger",
  situational: "border-warn/40 bg-warn/10 text-warn",
  optional: "border-line bg-surface-sunken text-ink-mute",
};

/**
 * Nodes that hurt more than they help. One line each — name, severity, what
 * it touches and when to skip it — with the full reason a tap away.
 */
export function TrapNodePanel() {
  const hardAvoid = atlasTrapNodes.filter((n) => n.severity === "avoid").length;
  return (
    <div id="atlas-trap-nodes" className="scroll-mt-40">
      <p className="mb-2.5 text-sm text-ink-dim">
        Atlas points can&apos;t be refunded. {hardAvoid} to always avoid, {atlasTrapNodes.length} in total — tap one
        for why.
      </p>
      <ul className="space-y-1.5">
        {atlasTrapNodes.map((trap) => (
          <li key={trap.id} id={trap.id} className="scroll-mt-40">
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
