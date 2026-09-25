"use client";

/**
 * The search dialog itself — loaded on first open, so the index of every
 * checklist step, cluster, strategy and boss isn't in every page's bundle.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchIndex, type SearchCategory, type SearchEntry } from "@/lib/searchIndex";

const CATEGORY_COLORS: Record<SearchCategory, string> = {
  Checklist: "text-[var(--good)]",
  Atlas: "text-chaos",
  Strategy: "text-[var(--accent)]",
  Boss: "text-[var(--danger)]",
  Build: "text-cold",
  Mistake: "text-[var(--danger)]",
  Glossary: "text-ink-dim",
  Character: "text-[var(--accent)]",
};

export default function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searchIndex.slice(0, 8);
    // Rank title matches above subtitle-only matches, so e.g. searching
    // "Xesht" surfaces the Xesht boss entry itself before a checklist step
    // that merely mentions Xesht in passing.
    return searchIndex
      .map((entry) => {
        const title = entry.title.toLowerCase();
        const subtitle = entry.subtitle.toLowerCase();
        let score = -1;
        if (title.startsWith(q)) score = 3;
        else if (title.includes(q)) score = 2;
        else if (subtitle.includes(q)) score = 1;
        return { entry, score };
      })
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((r) => r.entry);
  }, [query]);

  const goTo = (entry: SearchEntry) => {
    onClose();
    const samePage = window.location.pathname.replace(/\/$/, "").endsWith(entry.href);
    router.push(`${entry.href}#${entry.id}`);
    // A same-page push changes the hash through history.pushState, which
    // fires no hashchange — so tabs and the highlighter never hear of it.
    // router.push commits the URL asynchronously, so wait for the new hash.
    if (samePage) {
      let tries = 0;
      const announce = () => {
        if (decodeURIComponent(window.location.hash.slice(1)) === entry.id)
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        else if (++tries < 60) requestAnimationFrame(announce);
      };
      requestAnimationFrame(announce);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => onClose()}
    >
      <div
        className="w-full max-w-xl overflow-hidden card rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[activeIndex]) goTo(results[activeIndex]);
            }
          }}
          placeholder="Search steps, strategies, bosses, builds..."
          className="w-full border-b border-[var(--line)] bg-transparent px-4 py-3.5 text-sm text-ink outline-none placeholder:text-ink-mute"
        />
        <ul className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-ink-mute">
              No results
            </li>
          )}
          {results.map((entry, i) => (
            <li key={entry.id}>
              <button
                onClick={() => goTo(entry)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === activeIndex ? "bg-surface-sunken" : ""
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 text-[10px] font-medium tracking-wide uppercase ${CATEGORY_COLORS[entry.category]}`}
                >
                  {entry.category}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {entry.title}
                  </span>
                  <span className="block truncate text-xs text-ink-mute">
                    {entry.subtitle}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[10px] text-ink-mute">
          <span>↑↓ to navigate · Enter to select</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
