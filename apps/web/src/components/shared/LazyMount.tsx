"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mounts its children the first time the enclosing <details> opens — or, for
 * a panel nobody opens, a moment later when the browser is idle — and keeps
 * them mounted after. A closed <details> still renders everything inside it,
 * so a page of closed analysis panels was drawing a tree canvas, analysing
 * every item and reviewing every gem before anyone looked.
 *
 * Opening by any route counts — a click, "expand all", or a deep link that
 * sets `open` — since they all fire the element's `toggle` event.
 *
 * The idle mount is what keeps closed panels findable: find-in-page searches
 * (and auto-expands) closed <details>, but only content that exists. Panels
 * mount one per idle slot, so first render stays as light as before and no
 * single frame takes all of them.
 */
export function LazyMount({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const details = ref.current?.closest("details");
    if (!details) {
      setMounted(true);
      return;
    }
    const mount = () => setMounted(true);
    const onToggle = () => {
      if (details.open) mount();
    };
    onToggle();
    details.addEventListener("toggle", onToggle);
    const cancelIdle = whenIdle(mount);
    return () => {
      details.removeEventListener("toggle", onToggle);
      cancelIdle();
    };
  }, []);

  return mounted ? <>{children}</> : <span ref={ref} hidden />;
}

// One shared queue, drained one task per idle slot.
const queue: (() => void)[] = [];
let scheduled = false;

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};

function drain() {
  scheduled = false;
  queue.shift()?.();
  if (queue.length) schedule();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  const w = window as IdleWindow;
  // Safari has no requestIdleCallback; a short timeout keeps it off the
  // first frame there too.
  if (w.requestIdleCallback) w.requestIdleCallback(drain, { timeout: 2000 });
  else setTimeout(drain, 50);
}

function whenIdle(task: () => void): () => void {
  queue.push(task);
  schedule();
  return () => {
    const i = queue.indexOf(task);
    if (i >= 0) queue.splice(i, 1);
  };
}
