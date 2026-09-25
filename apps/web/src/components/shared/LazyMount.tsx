"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mounts its children the first time the enclosing <details> opens, and keeps
 * them mounted after. A closed <details> still renders everything inside it,
 * so a page of closed analysis panels was drawing a tree canvas, analysing
 * every item and reviewing every gem before anyone looked.
 *
 * Opening by any route counts — a click, "expand all", or a deep link that
 * sets `open` — since they all fire the element's `toggle` event.
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
    const onToggle = () => {
      if (details.open) setMounted(true);
    };
    onToggle();
    details.addEventListener("toggle", onToggle);
    return () => details.removeEventListener("toggle", onToggle);
  }, []);

  return mounted ? <>{children}</> : <span ref={ref} hidden />;
}
