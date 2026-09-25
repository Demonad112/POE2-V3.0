"use client";

import Link from "next/link";
import { assessReadiness, latestSnapshot, type ReadinessCheck } from "@poe2/core";
import { usePersistedState } from "@/hooks/usePersistedState";

const MILESTONE_LABELS = {
  mapping: "Mapping basics",
  ascendancy: "3rd Ascendancy",
  pinnacle: "Pinnacle push (Arbiter of Divinity)",
} as const;

function formatValue(c: ReadinessCheck, v: number): string {
  if (c.unit === "percent") return `${v}%`;
  if (c.unit === "level") return `lvl ${v}`;
  return v.toLocaleString();
}

/**
 * Grades the most recently imported character against the checklist's gates.
 * Reads the stored snapshot, so it works without re-importing.
 */
export function ReadinessPanel() {
  const { state } = usePersistedState();
  const snapshot = latestSnapshot(state.character.snapshots);

  if (!snapshot) {
    return (
      <section className="rounded-xl border border-dashed border-line bg-[var(--surface-raised)] p-5">
        <h2 className="font-semibold text-ink">Am I ready?</h2>
        <p className="mt-1 text-sm text-ink-mute">
          <Link href="/character" className="text-[var(--accent)] hover:underline">
            Import your character
          </Link>{" "}
          and this panel checks your resistances, life/ES pool and level against the
          checklist&apos;s gates.
        </p>
      </section>
    );
  }

  const { checks, ready } = assessReadiness(snapshot);
  const name = snapshot.key.split("/").pop();

  return (
    <section className="rounded-xl card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-ink">Am I ready?</h2>
        <span className="text-xs text-ink-mute">
          {name} · lvl {snapshot.level} · imported{" "}
          {new Date(snapshot.at).toLocaleDateString()}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {(Object.keys(MILESTONE_LABELS) as (keyof typeof MILESTONE_LABELS)[]).map((m) => (
          <div key={m} className="rounded-md border border-line bg-[var(--surface-sunken)] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">{MILESTONE_LABELS[m]}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                  ready[m]
                    ? "bg-good/15 text-[var(--good)]"
                    : "bg-danger/15 text-[var(--danger)]"
                }`}
              >
                {ready[m] ? "Ready" : "Not yet"}
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              {checks
                .filter((c) => c.milestone === m)
                .map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span className={c.pass ? "text-ink-mute" : "text-ink-dim"}>
                      {c.pass ? "✓" : "✗"} {c.label}
                    </span>
                    <span
                      className={`font-mono ${c.pass ? "text-[var(--good)]" : "text-[var(--danger)]"}`}
                    >
                      {formatValue(c, c.have)}
                      {!c.pass && ` / ${formatValue(c, c.need)}`}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-mute">
        Pinnacles also need everything under Mapping basics. Re-import on the{" "}
        <Link href="/character" className="text-[var(--accent)] hover:underline">
          character page
        </Link>{" "}
        after gear changes.
      </p>
    </section>
  );
}
