import type { DefenseSummary } from '@poe2/core'

/**
 * The small readouts that ride on a collapsed Accordion row.
 *
 * Each shows the single measurement its section is about, so the whole page
 * can be triaged without opening anything. Deliberately tiny and
 * non-interactive — the accordion row itself is the control.
 */

export type Tone = 'danger' | 'warn' | 'good' | 'muted' | 'accent'

const TONE_TEXT: Record<Tone, string> = {
  danger: 'text-danger',
  warn: 'text-warn',
  good: 'text-good',
  muted: 'text-ink-mute',
  accent: 'text-accent',
}

const TONE_BG: Record<Tone, string> = {
  danger: 'bg-danger',
  warn: 'bg-warn',
  good: 'bg-good',
  muted: 'bg-line',
  accent: 'bg-accent',
}

/** Uppercase status chip, border-only so it never competes with a filled bar. */
export function StatusChip({ tone = 'muted', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`shrink-0 rounded border border-current px-1.5 py-px text-[10px] font-bold tracking-wider uppercase ${TONE_TEXT[tone]}`}
    >
      {children}
    </span>
  )
}

/** A single headline number, e.g. combined DPS. */
export function NumberReadout({ value, tone = 'muted' }: { value: string; tone?: Tone }) {
  return <span className={`tabular text-base font-semibold tracking-tight ${TONE_TEXT[tone]}`}>{value}</span>
}

/** One pip per resistance — the fastest possible read of "am I capped?". */
export function ResistancePips({ resistances }: { resistances: DefenseSummary['resistances'] }) {
  return (
    <span className="flex gap-[3px]" aria-hidden="true">
      {resistances.map((r) => {
        const tone: Tone = r.capped ? 'good' : 'danger'
        return <span key={r.type} className={`h-[5px] w-4 rounded-[2px] ${TONE_BG[tone]}`} />
      })}
    </span>
  )
}

/**
 * Miniature max-hit bar: the weakest damage type against the safest one.
 * Same ratio the Defence panel leads with, so the collapsed and open views
 * can never disagree about what is at risk.
 */
export function DangerBar({ weakest, best, atRiskRatio = 1.5 }: { weakest: number; best: number; atRiskRatio?: number }) {
  const pct = best > 0 ? Math.min(100, (weakest / best) * 100) : 0
  const atRisk = best > 0 && weakest < best / atRiskRatio
  return (
    <span
      className="relative block h-[7px] w-[88px] overflow-hidden rounded-[3px] border border-line bg-surface-sunken"
      aria-hidden="true"
    >
      <span
        className={`absolute inset-y-0 left-0 rounded-[2px] ${atRisk ? 'bg-danger' : 'bg-ink-mute'}`}
        style={{ width: `${pct}%` }}
      />
    </span>
  )
}
