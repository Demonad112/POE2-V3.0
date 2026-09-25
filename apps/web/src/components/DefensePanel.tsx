'use client'

import type { DefenseSummary } from '@poe2/core'
import { Hero, Panel, Stat, Tag, fmt } from './ui'

const DMG_VAR: Record<string, string> = {
  physical: 'var(--dmg-physical)',
  fire: 'var(--dmg-fire)',
  cold: 'var(--dmg-cold)',
  lightning: 'var(--dmg-lightning)',
  chaos: 'var(--dmg-chaos)',
}

function cap(s: string) {
  return s[0]!.toUpperCase() + s.slice(1)
}

/**
 * A small ring: how full a resistance is against its cap, or how much physical
 * damage armour takes off. The number sits inside; the arc only restates it.
 */
function Gauge({ fraction, text, color, alert }: { fraction: number; text: string; color: string; alert: boolean }) {
  const r = 17
  const c = 2 * Math.PI * r
  const f = Math.max(0, Math.min(1, fraction))
  return (
    <span className="relative inline-flex size-11 shrink-0 items-center justify-center">
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--line)" strokeWidth="3.5" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={alert ? 'var(--danger)' : color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${f * c} ${c}`}
        />
      </svg>
      <span className={`tabular text-[11px] font-semibold ${alert ? 'text-danger' : 'text-ink'}`}>{text}</span>
    </span>
  )
}

/**
 * One row per damage type: its resistance (or armour, for physical) as a ring,
 * the largest hit of that type the character survives, and a bar against the
 * safest type. Sorted thinnest-first, so the killing vector leads. Every row is
 * labelled in words — colour never carries identity alone.
 */
function DamageTypes({ d }: { d: DefenseSummary }) {
  const hits = new Map<string, DefenseSummary['maxHits'][number]>(d.maxHits.map((m) => [m.type, m]))
  const res = new Map<string, DefenseSummary['resistances'][number]>(d.resistances.map((r) => [r.type, r]))
  const order: string[] = [...d.maxHits.map((m) => m.type), ...d.resistances.map((r) => r.type).filter((t) => !hits.has(t))]
  const max = Math.max(1, ...d.maxHits.map((m) => m.value))
  if (!order.length) return null

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="eyebrow">By damage type</h3>
        <span className="text-[11px] text-ink-mute">largest hit you survive</span>
      </div>
      <ul className="space-y-1.5">
        {order.map((type) => {
          const hit = hits.get(type)
          const r = res.get(type)
          const color = DMG_VAR[type] ?? 'var(--ink-dim)'
          const physical = type === 'physical'
          const gauge = r ? (
            <Gauge fraction={r.value / r.max} text={`${r.value}`} color={color} alert={!r.capped} />
          ) : physical && d.physicalDamageReduction !== null ? (
            <Gauge fraction={d.physicalDamageReduction / 100} text={`${d.physicalDamageReduction}`} color={color} alert={false} />
          ) : (
            <Gauge fraction={0} text="—" color={color} alert={false} />
          )
          const note = r
            ? r.underCap > 0
              ? <span className="text-danger">{r.value}/{r.max}% · {r.underCap} under cap</span>
              : <>
                  {r.value}/{r.max}% resist{r.overCap > 0 ? <span className="text-ink-mute"> · {r.overCap} over cap</span> : null}
                </>
            : physical
              ? d.physicalDamageReduction !== null
                ? `${d.physicalDamageReduction}% reduction from armour`
                : 'no resistance — armour only'
              : null
          return (
            <li
              key={type}
              className={`flex items-center gap-3 rounded-lg border bg-surface-sunken/60 py-2 pr-3 pl-2.5 ${
                hit?.isLowest ? 'border-danger/35' : 'border-line/70'
              }`}
            >
              {gauge}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-ink">
                    <span aria-hidden className="inline-block size-2 shrink-0 rounded-[2px]" style={{ background: color }} />
                    {cap(type)}
                    {hit?.isLowest ? <Tag tone="danger">kills first</Tag> : null}
                  </span>
                  <span className="tabular text-sm font-semibold text-ink">{hit ? fmt(hit.value) : '—'}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
                  {hit ? (
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(2, (hit.value / max) * 100)}%`, background: color }}
                    />
                  ) : null}
                </div>
                {note ? <div className="tabular mt-1 text-[11px] text-ink-dim">{note}</div> : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function DefensePanel({ d, bare = false }: { d: DefenseSummary; bare?: boolean }) {
  const overstates = d.ehpOverstatementRatio !== null && d.ehpOverstatementRatio > 1.5

  return (
    <Panel
      title="Defence"
      subtitle="Led by the smallest hit that kills — not by an averaged pool."
      bare={bare}
    >
      <div className="space-y-5">
        <Hero
          tone="danger"
          label={`Lowest maximum hit${d.lowestMaximumHitType ? ` · ${cap(d.lowestMaximumHitType)}` : ''}`}
          value={fmt(d.lowestMaximumHit)}
          caption={
            overstates ? (
              <>
                Effective health pool reads <span className="tabular text-ink">{fmt(d.effectiveHealthPool)}</span>,
                overstating survivability by{' '}
                <span className="tabular text-warn">{d.ehpOverstatementRatio!.toFixed(1)}×</span>. A single{' '}
                {d.lowestMaximumHitType} hit of {fmt(d.lowestMaximumHit)} is fatal.
              </>
            ) : (
              <>
                Effective health pool: <span className="tabular text-ink">{fmt(d.effectiveHealthPool)}</span>.
              </>
            )
          }
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Life" value={fmt(d.life)} />
          <Stat label="Energy Shield" value={fmt(d.energyShield)} />
          <Stat label="Ward" value={fmt(d.ward)} hint="0.5 mechanic" />
          <Stat label="Evasion" value={fmt(d.evasion)} hint={`${fmt(d.evadeChance)}% evade`} />
          <Stat
            label="Armour"
            value={fmt(d.armour)}
            tone={d.physicalDamageReduction !== null && d.physicalDamageReduction < 10 ? 'warn' : 'default'}
            hint={d.physicalDamageReduction !== null ? `${d.physicalDamageReduction}% phys reduction` : undefined}
          />
          <Stat
            label="Deflection"
            value={fmt(d.deflectionRating)}
            hint={`${fmt(d.deflectChance)}% · ${fmt(d.deflectEffect)}% effect`}
          />
        </div>

        <DamageTypes d={d} />

        <p className="text-[11px] leading-relaxed text-ink-mute">
          Chaos removes twice as much energy shield as it deals, so the raw chaos pool is{' '}
          <span className="tabular">{fmt(d.chaosRawPool)}</span> (life + half energy shield). Block caps at 50% in
          PoE2; resistances at 75%.
        </p>
      </div>
    </Panel>
  )
}
