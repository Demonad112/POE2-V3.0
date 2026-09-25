import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: ReactNode;
}) {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
        {title}
      </h1>
      <div className="mt-3 h-px w-24 bg-gradient-to-r from-[var(--accent)] to-transparent" />
      <p className="mt-4 max-w-3xl leading-relaxed text-ink-dim">{description}</p>
    </div>
  );
}
