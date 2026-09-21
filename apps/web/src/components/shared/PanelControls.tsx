'use client'

/**
 * Expand-all / collapse-all for a group of Accordions.
 *
 * Writes `open` directly on the <details> elements rather than lifting their
 * state into React. Native <details> owns its own open state — mirroring it
 * would mean two sources of truth that desync the moment a user clicks a
 * summary directly. This is a side effect of a user action, not derived
 * state, so reaching for the DOM is the right tool here.
 */
export function PanelControls({ targetId }: { targetId: string }) {
  const setAll = (open: boolean) => {
    const root = document.getElementById(targetId)
    if (!root) return
    for (const el of Array.from(root.querySelectorAll('details'))) {
      ;(el as HTMLDetailsElement).open = open
    }
  }

  const cls =
    'rounded border border-line bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-ink-mute transition-colors hover:border-accent/40 hover:text-ink'

  return (
    <span className="ml-auto flex gap-1.5">
      <button type="button" onClick={() => setAll(true)} className={cls}>
        Expand all
      </button>
      <button type="button" onClick={() => setAll(false)} className={cls}>
        Collapse all
      </button>
    </span>
  )
}
