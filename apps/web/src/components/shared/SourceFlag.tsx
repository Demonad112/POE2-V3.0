import type { SourceRef } from "@/lib/types";
import { citationUrl } from "@/data/sourceMeta";

const STYLES: Record<string, string> = {
  unverified: "bg-accent/20 text-[var(--warn)] border-accent/40",
  conflicting: "bg-danger/20 text-[var(--danger)] border-danger/40",
};

const LABELS: Record<string, string> = {
  unverified: "Unverified",
  conflicting: "Conflicting sources",
};

export function SourceFlag({ source }: { source: SourceRef }) {
  const links = (source.citations ?? [])
    .map((c) => citationUrl(c))
    .filter((l): l is { href: string; label: string } => l !== null);

  if (source.verified === "confirmed" && links.length === 0) return null;

  return (
    <>
      {source.verified !== "confirmed" && (
        <span
          title={source.note ?? "Verify in-game — source data may be stale."}
          className={`inline-flex cursor-help items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${STYLES[source.verified]}`}
        >
          ⚠ {LABELS[source.verified]}
        </span>
      )}
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          title={`Watch the source video at ${link.label}${source.note ? ` — ${source.note}` : ""}`}
          className="inline-flex items-center gap-0.5 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-mute transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
        >
          ▶ {link.label}
        </a>
      ))}
    </>
  );
}
