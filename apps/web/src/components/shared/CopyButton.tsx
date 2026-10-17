"use client";

import { useState } from "react";

/** Copies `text` exactly as given; the clipboard gets the raw string, never HTML-escaped. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState<string | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied");
    } catch {
      setStatus("Could not copy — select the text instead");
    }
    window.setTimeout(() => setStatus(null), 2500);
  };

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={() => void copy()}
        className="hit-area rounded-md border border-line px-2.5 py-1 text-xs text-ink-dim transition-colors hover:border-accent-line hover:text-ink"
      >
        Copy
      </button>
      <span role="status" aria-live="polite" className="text-[11px] text-ink-mute">
        {status}
      </span>
    </span>
  );
}
