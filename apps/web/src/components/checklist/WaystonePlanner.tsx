"use client";

import { MAX_TIER, planWaystones, type TierBand } from "@/lib/waystonePlan";
import { useChecklistState } from "@/hooks/useChecklistState";

const BAND_STYLES: Record<TierBand, string> = {
  none: "border-line text-ink-mute",
  white: "border-line bg-surface-sunken text-ink",
  yellow: "border-accent/40 bg-accent/15 text-[var(--warn)]",
  red: "border-danger/40 bg-danger/15 text-[var(--danger)]",
  corrupted: "border-danger/60 bg-danger/25 text-[var(--danger)]",
};

export function WaystonePlanner() {
  const { highestTier, setHighestTier } = useChecklistState();
  const plan = planWaystones(highestTier);

  return (
    <section
      id="waystone-planner"
      className="scroll-mt-28 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">Waystone planner</h2>
        <label className="flex items-center gap-2 text-sm text-ink-dim">
          Highest tier completed
          <select
            value={plan.highest}
            onChange={(e) => setHighestTier(Number(e.target.value))}
            className="rounded-md border border-line bg-[var(--surface-sunken)] px-2 py-1 font-mono text-ink"
          >
            <option value={0}>none yet</option>
            {Array.from({ length: MAX_TIER }, (_, i) => i + 1).map((t) => (
              <option key={t} value={t}>
                T{t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-ink-mute">Run next</dt>
          <dd className="mt-1 flex items-center gap-2">
            <span
              className={`rounded border px-2 py-0.5 font-mono font-semibold ${BAND_STYLES[plan.band]}`}
            >
              T{plan.nextTier}
            </span>
            <span className="text-ink-dim">area level {plan.nextAreaLevel}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-mute">Doryani sells</dt>
          <dd className="mt-1 text-ink-dim">
            {plan.doryaniSells
              ? `T${plan.doryaniSells} — restocks every level-up`
              : "Low tiers — clear T2 to unlock more"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-mute">Reforge</dt>
          <dd className="mt-1 text-ink-dim">{plan.reforge ?? "—"}</dd>
        </div>
      </dl>

      <p className="mt-3 text-sm text-ink-mute">
        <span className="font-medium text-ink-dim">Rolling: </span>
        {plan.rolling}
      </p>
      {plan.backups.length > 0 && (
        <p className="mt-1 text-sm text-ink-mute">
          <span className="font-medium text-ink-dim">Keep in reserve: </span>
          {plan.backups.join(", ")}.
        </p>
      )}

      <ol className="mt-4 flex flex-wrap gap-1.5">
        {[...plan.gatesPassed, ...(plan.nextGate ? [plan.nextGate] : [])].map((gate) => {
          const passed = gate.tier <= plan.highest;
          return (
            <li key={gate.tier}>
              <a
                href={`#${gate.stepId}`}
                title={gate.label}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                  passed
                    ? "border-good/30 bg-good/10 text-[var(--good)]"
                    : "border-[var(--accent)]/50 bg-[var(--accent-dim)] text-[var(--accent)]"
                }`}
              >
                {passed ? "✓" : "→"} T{gate.tier}
                {!passed && <span className="text-ink-dim">· {gate.label}</span>}
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
