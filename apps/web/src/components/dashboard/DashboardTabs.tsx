"use client";

/**
 * The dashboard's reference sections, one at a time: Strategies · Bosses ·
 * Builds · Milestones. Stacked, they ran to ~7,300px on a phone.
 *
 * A hash naming a strategy, boss or build (search results link that way)
 * switches to the tab that holds it, then scrolls to it and opens it.
 */

import { useEffect, useState } from "react";
import { farmingStrategies } from "@/data/strategies";
import { pinnacleBosses } from "@/data/bosses";
import { metaBuilds } from "@/data/metaBuilds";
import { currencyMilestones } from "@/data/currencyMilestones";
import { StrategyTable } from "./StrategyTable";
import { BossCard } from "./BossCard";
import { MetaBuildList } from "./MetaBuildList";
import { CurrencyMilestones } from "./CurrencyMilestones";

type TabId = "strategies" | "bosses" | "builds" | "milestones";

const TABS: { id: TabId; label: string; count: number }[] = [
  { id: "strategies", label: "Strategies", count: farmingStrategies.length },
  { id: "bosses", label: "Pinnacle bosses", count: pinnacleBosses.length },
  { id: "builds", label: "Meta builds", count: metaBuilds.length },
  { id: "milestones", label: "Milestones", count: currencyMilestones.length },
];

function locate(id: string): TabId | null {
  if (farmingStrategies.some((s) => s.id === id)) return "strategies";
  if (pinnacleBosses.some((b) => b.id === id)) return "bosses";
  if (metaBuilds.some((b) => b.id === id)) return "builds";
  if (currencyMilestones.some((m) => m.id === id)) return "milestones";
  return null;
}

function Intro({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-ink-dim">{children}</p>;
}

export function DashboardTabs() {
  const [tab, setTab] = useState<TabId>("strategies");

  useEffect(() => {
    const sync = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const found = id ? locate(id) : null;
      if (!found) return;
      setTab(found);
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el instanceof HTMLDetailsElement) el.open = true;
        el?.scrollIntoView({ block: "center" });
      });
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Dashboard sections"
        className="sticky top-14 z-10 -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-line bg-surface/85 px-4 py-2 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:px-1.5 sm:py-1.5"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
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
              <span className={`tabular text-[10px] ${active ? "text-accent" : "text-ink-mute"}`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {tab === "strategies" ? (
          <>
            <Intro>Ranked by the 0.5.5 creator tier list. Tap a strategy for its expected return, Atlas setup and source clips.</Intro>
            <StrategyTable strategies={farmingStrategies} />
          </>
        ) : null}
        {tab === "bosses" ? (
          <>
            <Intro>What each pinnacle costs to enter. Tap a boss for the unlock route and fight notes.</Intro>
            <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pinnacleBosses.map((boss) => (
                <BossCard key={boss.id} boss={boss} />
              ))}
            </div>
          </>
        ) : null}
        {tab === "builds" ? <MetaBuildList builds={metaBuilds} /> : null}
        {tab === "milestones" ? <CurrencyMilestones milestones={currencyMilestones} /> : null}
      </div>
    </div>
  );
}
