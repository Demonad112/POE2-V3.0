"use client";

import Link from "next/link";
import type { CharacterSnapshot } from "@poe2/core";
import { usePersistedState } from "@/hooks/usePersistedState";
import { recentCharacters } from "@/lib/recentCharacters";
import { useLocalStore } from "@/lib/localStore";

const RES = [
  ["fire", "Fire", "bg-fire"],
  ["cold", "Cold", "bg-cold"],
  ["lightning", "Light.", "bg-lightning"],
  ["chaos", "Chaos", "bg-chaos"],
] as const;

function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function ago(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(mins)) return "";
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function Delta({ now, before }: { now: number; before: number | undefined }) {
  if (before === undefined || now === before || before === 0) return null;
  const up = now > before;
  return (
    <span className={`ml-1 text-[11px] font-medium ${up ? "text-good" : "text-danger"}`}>
      {up ? "▲" : "▼"} {compact(Math.abs(now - before))}
    </span>
  );
}

/**
 * The last character analysed in this browser, from the history the character
 * page already records. Every figure is a recorded one; nothing is shown for a
 * value the import did not have. Hidden until there is a snapshot.
 */
export function LastCharacterCard() {
  const { state } = usePersistedState();
  const recents = useLocalStore(recentCharacters);
  const snapshots = state.character.snapshots;
  if (snapshots.length === 0) return null;

  const latest = snapshots.reduce((a, b) => (b.at > a.at ? b : a));
  const same = snapshots.filter((s) => s.key === latest.key && s !== latest);
  const previous: CharacterSnapshot | undefined = same.reduce<CharacterSnapshot | undefined>(
    (a, b) => (!a || b.at > a.at ? b : a),
    undefined
  );
  const recent = recents.find((r) => r.key === latest.key);
  const name = recent?.name ?? latest.key.split("/").pop() ?? latest.key;
  const href = recent ? `/character?import=${encodeURIComponent(recent.url)}` : "/character";

  const figures: { label: string; value: number; before?: number; show: boolean }[] = [
    { label: "Life", value: latest.life, before: previous?.life, show: latest.life > 0 },
    { label: "Energy shield", value: latest.energyShield, before: previous?.energyShield, show: latest.energyShield > 0 },
    { label: "Main skill DPS", value: latest.dps, before: previous?.dps, show: latest.dps > 0 },
    { label: "Killed by", value: latest.weakestHit, before: previous?.weakestHit, show: latest.weakestHit > 0 },
  ];

  return (
    <section
      aria-labelledby="last-character-title"
      className="card relative overflow-hidden rounded-xl p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="eyebrow">Last character</span>
        <span className="text-xs text-ink-mute">Analysed {ago(latest.at)}</span>
      </div>
      <h2 id="last-character-title" className="mt-1 font-display text-2xl font-semibold text-ink">
        {name}
        <span className="ml-2 font-sans text-sm font-normal text-ink-mute">
          Level {latest.level}
          {recent?.className ? ` ${recent.className}` : ""}
        </span>
      </h2>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {figures
          .filter((f) => f.show)
          .map((f) => (
            <div key={f.label} className="min-w-0 rounded-lg border border-line/80 bg-surface-sunken/80 px-3 py-2.5">
              <dt className="eyebrow truncate">{f.label}</dt>
              <dd className="tabular mt-1 truncate text-xl leading-none font-semibold text-ink">
                {compact(f.value)}
                <Delta now={f.value} before={f.before} />
              </dd>
            </div>
          ))}
      </dl>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-dim" aria-label="Resistances">
        {RES.map(([type, label, dot]) => {
          const value = latest[type];
          // 75 is the base cap; a value below it is under cap whatever the maximum.
          const short = type !== "chaos" && value < 75;
          return (
            <li key={type} className="flex items-center gap-1.5">
              <span aria-hidden className={`inline-block size-1.5 rounded-[1px] ${dot}`} />
              {label}
              <span className={`tabular font-semibold ${short ? "text-danger" : "text-ink"}`}>{value}%</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={href}
          className="rounded-md border border-accent-line bg-accent-soft px-3 py-1.5 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20"
        >
          {recent ? "Re-import and analyse" : "Open character page"} →
        </Link>
        {previous ? (
          <span className="text-[11px] text-ink-mute">▲▼ change since the import before, {ago(previous.at)}</span>
        ) : null}
      </div>
    </section>
  );
}
