'use client'

/**
 * How four figures moved across this character's imports: one small chart per
 * figure, each on its own scale — they are different units, so sharing an axis
 * would flatten the small ones. The line is recessive; the latest import is the
 * accent point. An import where poe.ninja did not report a figure is a gap in
 * the line, not a drop to zero.
 */

import { useRef, useState } from 'react'
import type { CharacterSnapshot } from '@poe2/core'
import { sparkline } from '@/lib/sparkline'
import { fmt, fmtCompact } from '../ui'

interface Metric {
  label: string
  read: (s: CharacterSnapshot) => number | null
}

// Zero is "not reported" for DPS and the max hit; for life and ES it is real.
const METRICS: Metric[] = [
  { label: 'Life', read: (s) => s.life },
  { label: 'Energy shield', read: (s) => s.energyShield },
  { label: 'Main skill DPS', read: (s) => s.dps || null },
  { label: 'Hit that kills', read: (s) => s.weakestHit || null },
]

const W = 240
const H = 44

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

function Row({ metric, snapshots }: { metric: Metric; snapshots: CharacterSnapshot[] }) {
  const values = snapshots.map(metric.read)
  const spark = sparkline(values, W, H)
  const [hover, setHover] = useState<number | null>(null)

  const lastIndex = values.reduce<number>((last, v, i) => (v !== null ? i : last), -1)
  const firstIndex = values.findIndex((v) => v !== null)
  const shown = hover ?? lastIndex
  const delta = firstIndex !== lastIndex ? values[lastIndex]! - values[firstIndex]! : null

  const nearest = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - box.left) / box.width) * W
    let best: number | null = null
    spark.points.forEach((p, i) => {
      if (p && (best === null || Math.abs(p.x - x) < Math.abs(spark.points[best]!.x - x))) best = i
    })
    return best
  }
  // Set when a tap has just cleared the reading, so the moves that follow the
  // same touch don't put it straight back.
  const cleared = useRef(false)
  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!cleared.current) setHover(nearest(e))
  }
  // A finger lifting ends the pointer, so a touch reading would vanish the
  // moment it could be read. A tap keeps its point; tapping it again clears it.
  const tap = (e: React.PointerEvent<SVGSVGElement>) => {
    const best = nearest(e)
    cleared.current = e.pointerType !== 'mouse' && best === hover
    setHover(cleared.current ? null : best)
  }

  const last = spark.points[lastIndex]
  const marked = hover !== null ? spark.points[hover] : null

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-line py-2 first:border-t-0 sm:grid-cols-[9rem_minmax(0,22rem)]">
      <div className="min-w-0">
        <div className="text-[11px] text-ink-mute">{metric.label}</div>
        <div className="tabular text-sm font-semibold text-ink">
          {fmt(values[shown])}
          {hover !== null ? <span className="ml-1.5 text-[11px] font-normal text-ink-mute">{day(snapshots[hover]!.at)}</span> : null}
        </div>
        {delta !== null && hover === null ? (
          <div className={`tabular text-[11px] ${delta > 0 ? 'text-good' : delta < 0 ? 'text-danger' : 'text-ink-mute'}`}>
            {delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : ''}
            {delta === 0 ? 'no change' : fmtCompact(delta)} since {day(snapshots[firstIndex]!.at)}
          </div>
        ) : null}
      </div>
      {/* The line stretches to the box; the dot is HTML over it so it stays round. */}
      <div className="relative mr-1.5 h-11 w-28 sm:w-full" aria-hidden="true">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full touch-none"
        onPointerMove={pick}
        onPointerDown={tap}
        onPointerUp={() => {
          cleared.current = false
        }}
        onPointerLeave={(e) => {
          cleared.current = false
          if (e.pointerType === 'mouse') setHover(null)
        }}
      >
        {spark.segments.map((d) => (
          <path key={d} d={d} fill="none" stroke="var(--ink-mute)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
        {marked ? <line x1={marked.x} x2={marked.x} y1={0} y2={H} stroke="var(--line-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      {last ? (
        <span
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-surface-raised"
          style={{ left: `${(last.x / W) * 100}%`, top: `${(last.y / H) * 100}%` }}
        />
      ) : null}
      </div>
    </li>
  )
}

export function HistoryChart({ snapshots }: { snapshots: CharacterSnapshot[] }) {
  const rows = METRICS.filter((m) => snapshots.some((s) => (m.read(s) ?? 0) !== 0))
  if (snapshots.length < 2 || !rows.length) return null

  const summary = rows
    .map((m) => {
      const v = snapshots.map(m.read).filter((x): x is number => x !== null)
      return `${m.label} ${fmt(v[0])} to ${fmt(v.at(-1))}`
    })
    .join('; ')

  return (
    <figure className="mb-4">
      <figcaption className="sr-only">
        Across {snapshots.length} imports: {summary}.
      </figcaption>
      <ul role="img" aria-label={`Trends across ${snapshots.length} imports: ${summary}.`}>
        {rows.map((m) => (
          <Row key={m.label} metric={m} snapshots={snapshots} />
        ))}
      </ul>
      <details className="mt-1 text-[11px] text-ink-mute">
        <summary className="hit-area cursor-pointer select-none">Show as a table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="tabular w-full text-right text-xs">
            <thead>
              <tr className="text-ink-mute">
                <th scope="col" className="py-1 text-left font-normal">Import</th>
                {rows.map((m) => (
                  <th key={m.label} scope="col" className="py-1 font-normal">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.at} className="border-t border-line text-ink-dim">
                  <th scope="row" className="py-1 text-left font-normal">
                    {day(s.at)}
                  </th>
                  {rows.map((m) => (
                    <td key={m.label} className="py-1">
                      {fmt(m.read(s))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
