"use client";

import { useMemo, useState } from "react";
import type { FarmingStrategy } from "@/lib/types";
import { Tag } from "@/components/shared/Tag";
import { SourceFlag } from "@/components/shared/SourceFlag";

type SortKey = "rank" | "investment" | "risk";
const TIER_ORDINAL: Record<string, number> = { low: 0, medium: 1, high: 2 };

export const STRATEGY_TIER_STYLES: Record<string, string> = {
  S: "border-[var(--accent)]/50 bg-[var(--accent-dim)] text-[var(--accent)]",
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

export function StrategyTable({ strategies }: { strategies: FarmingStrategy[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");

  const sorted = useMemo(() => {
    return [...strategies].sort((a, b) => {
      if (sortKey === "rank") return a.rank - b.rank;
      return TIER_ORDINAL[a[sortKey]] - TIER_ORDINAL[b[sortKey]];
    });
  }, [strategies, sortKey]);

  const headerButton = (key: SortKey, label: string) => (
    <button
      onClick={() => setSortKey(key)}
      className={`text-left font-medium transition-colors ${
        sortKey === key ? "text-[var(--accent)]" : "text-ink-mute hover:text-ink-dim"
      }`}
    >
      {label}
      {sortKey === key ? " ▾" : ""}
    </button>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-[var(--line)] bg-[var(--surface-sunken)]">
          <tr>
            <th className="px-3 py-2.5 text-left">{headerButton("rank", "Strategy")}</th>
            <th className="px-3 py-2.5 text-left">Mechanics</th>
            <th className="px-3 py-2.5 text-left">
              {headerButton("investment", "Investment")}
            </th>
            <th className="px-3 py-2.5 text-left">Expected return</th>
            <th className="px-3 py-2.5 text-left">{headerButton("risk", "Risk")}</th>
            <th className="px-3 py-2.5 text-left">LS / Late</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((strategy) => (
            <tr
              key={strategy.id}
              className="border-b border-line transition-colors last:border-0 hover:bg-surface-sunken"
            >
              <td className="px-3 py-2 font-medium text-ink">
                <div className="flex flex-wrap items-center gap-2">
                  <StrategyTierBadge tier={strategy.tier} />
                  {strategy.name}
                  <SourceFlag source={strategy.source} />
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {strategy.mechanics.map((m) => (
                    <Tag key={m} mechanic={m} />
                  ))}
                </div>
              </td>
              <td className="px-3 py-2 text-ink-dim">{strategy.investment}</td>
              <td className="px-3 py-2 text-ink-mute">
                {strategy.expectedReturn}
              </td>
              <td className="px-3 py-2 text-ink-dim">{strategy.risk}</td>
              <td className="px-3 py-2 text-ink-mute">
                {strategy.leagueStartViable ? "LS" : "—"} /{" "}
                {strategy.lateGameViable ? "Late" : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
