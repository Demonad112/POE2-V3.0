"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";

/**
 * A sideways-scrolling strip that fades out at whichever edge has more to
 * show, so a phone user can tell there are tabs off-screen. The fade itself
 * is CSS (globals.css, `[data-scroll-fade]`); this only keeps the two
 * attributes current as the strip scrolls or resizes.
 */
export function ScrollFade({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const start = el.scrollLeft > 1;
      const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      el.toggleAttribute("data-overflow-start", start);
      el.toggleAttribute("data-overflow-end", end);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={ref} data-scroll-fade="" className={`overflow-x-auto ${className}`} {...rest}>
      {children}
    </div>
  );
}
