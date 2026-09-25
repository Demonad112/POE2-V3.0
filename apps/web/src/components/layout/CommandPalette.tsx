"use client";

import { lazy, Suspense, useEffect, useState } from "react";

/** Loaded on first open — see SearchDialog. */
const SearchDialog = lazy(() => import("./SearchDialog"));

export const OPEN_SEARCH_EVENT = "app:open-search";

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpenEvent);
    };
  }, []);

  if (!open) return null;
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm">
          <div className="card h-14 w-full max-w-xl animate-pulse rounded-xl" />
        </div>
      }
    >
      <SearchDialog onClose={() => setOpen(false)} />
    </Suspense>
  );
}
