'use client'

/** "Changed since last report": the move between the two latest stored snapshots. */

import type { Analysis, CharacterSnapshot, MetricDelta } from '@poe2/core'
import { changedFor } from '@/lib/characterNotes'
import { fmt, Tag } from '../ui'

const when = (iso: string | null): string => {
  if (!iso) return 'unknown time'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function Row({ c }: { c: MetricDelta }) {
  const suffix = c.unit === 'percent' ? '%' : ''
  const sign = c.delta > 0 ? '+' : ''
  return (
    <li className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-ink">{c.label}</span>
      <span className={`tabular ${c.improved ? 'text-good' : 'text-danger'}`}>
        {fmt(c.before)}
        {suffix} → {fmt(c.after)}
        {suffix} ({sign}
        {fmt(c.delta)}
        {suffix})
      </span>
    </li>
  )
}

export function ChangedSincePanel({ analysis, snapshots }: { analysis: Analysis; snapshots: CharacterSnapshot[] }) {
  const ch = changedFor(analysis, snapshots)

  return (
    <section className="card mb-3 rounded-xl p-4" aria-label="Changed since last report">
      <h3 className="text-xs font-medium tracking-wide text-ink-dim uppercase">Changed since last report</h3>
      {!ch.available ? (
        <p className="mt-1.5 text-xs text-ink-dim">Import again after playing; two reports are needed to compare.</p>
      ) : (
        <>
          <p className="mt-1 text-[11px] text-ink-mute">
            {when(ch.since)} → {when(ch.until)}
          </p>
          {ch.unchanged ? <p className="mt-1.5 text-xs text-ink-dim">No tracked figure moved.</p> : null}
          {ch.improved.length ? (
            <ul className="mt-2 space-y-1">
              {ch.improved.map((c) => (
                <Row key={c.field} c={c} />
              ))}
            </ul>
          ) : null}
          {ch.worsened.length ? (
            <ul className="mt-2 space-y-1">
              {ch.worsened.map((c) => (
                <Row key={c.field} c={c} />
              ))}
            </ul>
          ) : null}
          {ch.newlyCapped.length || ch.newlyUncapped.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ch.newlyCapped.map((r) => (
                <Tag key={`c-${r}`} tone="good">
                  {r} reached cap
                </Tag>
              ))}
              {ch.newlyUncapped.map((r) => (
                <Tag key={`u-${r}`} tone="danger">
                  {r} dropped below cap
                </Tag>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
