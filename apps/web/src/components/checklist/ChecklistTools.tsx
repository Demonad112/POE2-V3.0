"use client";

/**
 * The Waystone planner and the readiness check. Side by side on a wide
 * screen; on a phone, one at a time behind a two-button switcher, so the
 * checklist itself starts a screen sooner.
 */

import { useState } from "react";
import { ReadinessPanel } from "./ReadinessPanel";
import { WaystonePlanner } from "./WaystonePlanner";

type Tool = "waystones" | "ready";

export function ChecklistTools() {
  const [tool, setTool] = useState<Tool>("waystones");
  return (
    <div>
      <div role="tablist" aria-label="Planning tools" className="mb-2 flex gap-1 lg:hidden">
        {(
          [
            ["waystones", "Waystone planner"],
            ["ready", "Am I ready?"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tool === id}
            onClick={() => setTool(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tool === id ? "bg-accent-soft text-ink ring-1 ring-accent-line" : "text-ink-mute hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={tool === "waystones" ? "" : "hidden lg:block"}>
          <WaystonePlanner />
        </div>
        <div className={tool === "ready" ? "" : "hidden lg:block"}>
          <ReadinessPanel />
        </div>
      </div>
    </div>
  );
}
