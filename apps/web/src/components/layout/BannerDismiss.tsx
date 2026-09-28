"use client";

import { BANNER_KEY } from "@/lib/bannerDismiss";

export function BannerDismiss({ patch }: { patch: string }) {
  return (
    <button
      type="button"
      aria-label="Dismiss patch notice"
      title="Hide until the next patch"
      onClick={() => {
        try {
          localStorage.setItem(BANNER_KEY, patch);
        } catch {
          // Storage blocked: it still hides for this page view.
        }
        document.documentElement.setAttribute("data-banner-dismissed", "");
      }}
      className="hit-area shrink-0 rounded px-1.5 text-sm leading-none text-ink-mute hover:text-ink"
    >
      ×
    </button>
  );
}
