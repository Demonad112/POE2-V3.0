"use client";

import { useMemo, useState } from "react";
import type { FarmingStrategy } from "@/lib/types";
import { Tag } from "@/components/shared/Tag";
import { SourceFlag } from "@/components/shared/SourceFlag";

type SortKey = "rank" | "investment" | "risk";
const TIER_ORDINAL: Record<string, number> = { low: 0, medium: 1, high: 2 };

export const STRATEGY_TIER_STYLES: Record<string, string> = {
  S: "border-[var(--accent)]/50 bg-accent-soft text-[var(--accent)]",
  A: "border-good/40 bg-good/10 text-[var(--good)]",
  B: "border-line bg-surface-sunken text-ink-dim",
  C: "border-line bg-surface-sunken text-ink-mute",
};

export function StrategyTierBadge({ tier }: { tier?: string }) {
  return (
    <span
      title={tier ? `${tier} tier on the 0.5.5 creator tier list` : "Not ranked by a 0.5.5 source"}
      className={`inline-flex size-6 shrink-0 items-center justify-center rounded border font-mono text-xs font-bold ${
        tier ? STRATEGY_TIER_STYLES[tier] : "border-line text-ink-mute"
      }`}
    >
      {tier ?? "–"}
    </span>
  );
}

const LEVEL_TONE: Record<string, string> = {
  low: "text-[var(--good)]",
  medium: "text-accent",
  high: "text-danger",
};

function Level({ label, value }: { label: string; value: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-ink-mute">{label} </span>
      <span className={LEVEL_TONE[value] ?? "text-ink-dim"}>{value}</span>
    </span>
  );
}

/**
 * Ranked strategies as one-line rows: tier, name, mechanics, investment and
 * risk. Tap a row for the expected return, Atlas setup and sources. The old
 * table forced a 720px minimum width, so on a phone it scrolled sideways with
 * the return text squeezed into a narrow column.
 */
export function StrategyTable({ strategies }: { strategies: FarmingStrategy[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");

  const sorted = useMemo(() => {
    return [...strategies].sort((a, b) => {
      if (sortKey === "rank") return a.rank - b.rank;
      return TIER_ORDINAL[a[sortKey]] - TIER_ORDINAL[b[sortKey]] || a.rank - b.rank;
    });
  }, [strategies, sortKey]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-ink-mute">Sort by</span>
        {(
          [
            ["rank", "Tier list"],
            ["investment", "Cheapest"],
            ["risk", "Safest"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={sortKey === key}
            onClick={() => setSortKey(key)}
            className={`rounded-full border px-2.5 py-0.5 transition-colors ${
              sortKey === key
                ? "border-accent-line bg-accent-soft text-accent"
                : "border-line text-ink-dim hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <ol className="overflow-hidden rounded-xl border border-line bg-surface-raised shadow-[var(--lift)]">
        {sorted.map((strategy) => (
          <li key={strategy.id} className="border-b border-line last:border-b-0">
            <details id={strategy.id} className="group scroll-mt-40">
              <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 transition-colors hover:bg-surface-overlay/60 [&::-webkit-details-marker]:hidden">
                <StrategyTierBadge tier={strategy.tier} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{strategy.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    <Level label="Invest" value={strategy.investment} />
                    <Level label="Risk" value={strategy.risk} />
                    <span className="text-ink-mute">
                      {[strategy.leagueStartViable && "League start", strategy.lateGameViable && "Late game"]
                        .filter(Boolean)
                        .join(" · ") || "Niche"}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="hidden flex-wrap justify-end gap-1 sm:flex">
                    {strategy.mechanics.map((m) => (
                      <Tag key={m} mechanic={m} />
                    ))}
                  </span>
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="size-3.5 text-ink-mute transition-transform group-open:rotate-90"
                  >
                    <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </summary>
              <div className="space-y-2 border-t border-line bg-surface-sunken/40 px-3 py-3 sm:pl-12">
                {strategy.mechanics.length ? (
                  <div className="flex flex-wrap gap-1 sm:hidden">
                    {strategy.mechanics.map((m) => (
                      <Tag key={m} mechanic={m} />
                    ))}
                  </div>
                ) : null}
                <p className="text-sm leading-relaxed text-ink">
                  <span className="text-ink-mute">Return: </span>
                  {strategy.expectedReturn}
                </p>
                <p className="text-sm leading-relaxed text-ink-dim">
                  <span className="text-ink-mute">Atlas setup: </span>
                  {strategy.atlasSetup}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 empty:hidden">
                  <SourceFlag source={strategy.source} />
                </div>
              </div>
            </details>
          </li>
        ))}
      </ol>
    </div>
  );
}
