"use client";

/**
 * Mistakes to avoid at one stage, as a compact list: one row per mistake with
 * the reason a tap away. It used to print every mistake in full in red, which
 * on a phone was a screen-and-a-half of alarm text; now red marks the panel,
 * and the words are ordinary ink.
 *
 * A link to `#<mistake-id>` opens the panel and that row.
 */

import { useEffect, useMemo, useRef } from "react";
import type { CommonMistake, Stage } from "@/lib/types";
import { Tag } from "./Tag";

function Chevron() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-3.5 shrink-0 text-ink-mute transition-transform group-open:rotate-90">
      <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WarningPanel({
  mistakes,
  stage,
  title = "Common mistakes",
  collapsible = true,
}: {
  mistakes: CommonMistake[];
  stage: Stage;
  title?: string;
  /** False when a parent disclosure already wraps it. */
  collapsible?: boolean;
}) {
  const relevant = useMemo(() => mistakes.filter((m) => m.appliesToStage.includes(stage)), [mistakes, stage]);
  const outer = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!relevant.some((m) => m.id === id)) return;
      if (outer.current) outer.current.open = true;
      const row = document.getElementById(id);
      if (row instanceof HTMLDetailsElement) row.open = true;
      row?.scrollIntoView({ block: "center" });
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [relevant]);

  if (relevant.length === 0) return null;

  const list = (
    <ul className="divide-y divide-line">
      {relevant.map((m) => (
        <li key={m.id}>
          <details id={m.id} className="group scroll-mt-40">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2.5 text-sm text-ink hover:bg-surface-overlay/50 [&::-webkit-details-marker]:hidden">
              <Chevron />
              <span className="min-w-0 flex-1">{m.title}</span>
              {m.relatedMechanics?.length ? (
                <span className="hidden shrink-0 gap-1 sm:flex">
                  {m.relatedMechanics.map((mech) => (
                    <Tag key={mech} mechanic={mech} />
                  ))}
                </span>
              ) : null}
            </summary>
            <p className="px-3.5 pb-3 pl-9 text-xs leading-relaxed text-ink-dim">{m.description}</p>
          </details>
        </li>
      ))}
    </ul>
  );

  if (!collapsible) return <div className="overflow-hidden rounded-lg border border-line bg-surface-sunken/60">{list}</div>;

  return (
    <details
      ref={outer}
      className="card group/outer relative overflow-hidden rounded-xl before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-danger"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="text-danger">
          ⚠
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-ink">
          {title}
          <span className="ml-2 font-normal text-ink-mute">{relevant.length} to avoid</span>
        </span>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-3.5 text-ink-mute transition-transform group-open/outer:rotate-90">
          <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="border-t border-line">{list}</div>
    </details>
  );
}
