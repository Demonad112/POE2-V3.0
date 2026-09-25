"use client";

/**
 * Saved replacement plans, from the character page's replacement planner.
 * Renders nothing until something has been saved, so the checklist stays
 * uncluttered for players who never use it.
 */

import Link from "next/link";
import { useShoppingList } from "@/hooks/useShoppingList";

export function GearShoppingList() {
  const { entries, toggle, remove } = useShoppingList();
  if (!entries.length) return null;
  const open = entries.filter((e) => !e.done).length;

  return (
    <section
      id="gear-shopping-list"
      className="scroll-mt-28 rounded-xl card p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-semibold text-ink">Gear shopping list</h2>
        <span className="text-xs text-ink-mute">
          {open} to find · saved from{" "}
          <Link href="/character" className="text-accent hover:underline">
            the replacement planner
          </Link>
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {entries.map((e) => (
          <li
            key={e.id}
            className={`rounded-lg border border-line bg-[var(--surface-sunken)] p-3 text-sm ${e.done ? "opacity-60" : ""}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <label className="flex min-w-0 items-start gap-2">
                <input
                  type="checkbox"
                  checked={e.done}
                  onChange={() => toggle(e.id)}
                  className="mt-1 size-4 accent-emerald-500"
                  aria-label={`Mark the ${e.slotLabel} replacement as found`}
                />
                <span className="min-w-0">
                  <span className={`font-medium text-ink ${e.done ? "line-through" : ""}`}>
                    {e.slotLabel}: a {e.baseType}
                  </span>
                  <span className="ml-2 text-xs text-ink-mute">
                    replacing {e.itemName}
                    {e.characterName ? ` on ${e.characterName}` : ""}
                    {e.ilvlNeeded !== null ? ` · item level ${e.ilvlNeeded}+` : ""}
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={() => remove(e.id)}
                className="text-xs text-ink-mute hover:text-[var(--danger)]"
              >
                Remove
              </button>
            </div>
            {e.lines.length ? (
              <ul className="mt-2 ml-6 list-disc space-y-0.5 pl-4 text-xs text-ink-dim">
                {e.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            ) : null}
            {e.followUps.length ? (
              <div className="mt-2 ml-6 text-xs text-ink-dim">
                <p className="text-ink-mute">Then, to stay capped:</p>
                <ol className="list-decimal space-y-0.5 pl-5">
                  {e.followUps.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ol>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
