'use client'

/**
 * The character's stat sheet: who they are, and the
 * handful of figures a player checks first — pools, the hit that kills them,
 * main-skill damage, resistances, spirit. The verdict stays in the Assessment
 * panel directly below, rather than appearing twice.
 *
 * Every value is read straight off the analysis; nothing here is computed. A
 * figure the data doesn't have (spirit without a PoB export, a max hit poe.ninja
 * didn't report) drops its tile rather than showing a zero.
 */

import { auditSpirit, type Analysis } from '@poe2/core'
import { Tag, fmt, fmtCompact } from '@/components/ui'

const RES_LABEL: Record<string, string> = { fire: 'Fire', cold: 'Cold', lightning: 'Light.', chaos: 'Chaos' }
const RES_COLOR: Record<string, string> = {
  fire: 'bg-fire',
  cold: 'bg-cold',
  lightning: 'bg-lightning',
  chaos: 'bg-chaos',
}

function Tile({
  label,
  value,
  caption,
  tone = 'default',
  children,
}: {
  label: string
  value?: string
  caption?: string | null
  tone?: 'default' | 'danger' | 'accent' | 'good'
  children?: React.ReactNode
}) {
  const color =
    tone === 'danger' ? 'text-danger' : tone === 'accent' ? 'text-accent' : tone === 'good' ? 'text-good' : 'text-ink'
  return (
    <div className="min-w-0 rounded-lg border border-line/80 bg-surface-sunken/80 px-3.5 py-3">
      <div className="eyebrow truncate">{label}</div>
      {value !== undefined ? (
        <div className={`tabular mt-1.5 truncate text-2xl leading-none font-semibold tracking-tight ${color}`}>{value}</div>
      ) : null}
      {children}
      {caption ? <div className="mt-1.5 truncate text-[11px] text-ink-mute">{caption}</div> : null}
    </div>
  )
}

export function CharacterHero({ analysis }: { analysis: Analysis }) {
  const { identity, defense, dps, pobStats } = analysis
  const primary = dps.primary
  const spirit = auditSpirit(pobStats)
  const spiritTotal = spirit?.total ?? (defense.spirit > 0 ? defense.spirit : null)
  const uncapped = defense.resistances.filter((r) => !r.capped).length

  return (
    <section className="card relative overflow-hidden rounded-2xl border-accent-line/60">
      {/* Gold wash behind the name — atmosphere, not data. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_0%_0%,var(--accent-soft),transparent_65%)]"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <div className="eyebrow text-accent">Character</div>
          <h2 className="font-display mt-1 truncate text-3xl font-bold text-ink sm:text-4xl">{identity.name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-dim">
            <span>
              Level <span className="tabular font-semibold text-ink">{identity.level ?? '—'}</span>
              {identity.className ? <> · {identity.className}</> : null}
            </span>
            {identity.league ? <Tag>{identity.league}</Tag> : null}
            {pobStats ? <Tag tone="good">cross-validated</Tag> : null}
          </div>
        </div>
      </div>

      <div className="gold-rule relative" />

      <div className="relative grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-6">
        <Tile label="Life" value={fmt(defense.life)} />
        <Tile label="Energy shield" value={fmt(defense.energyShield)} />
        {defense.lowestMaximumHit !== null ? (
          <Tile
            label="Killed by"
            value={fmt(defense.lowestMaximumHit)}
            caption={defense.lowestMaximumHitType ? `${defense.lowestMaximumHitType} hit` : null}
            tone="danger"
          />
        ) : null}
        {primary ? (
          <Tile label="Main skill DPS" value={fmtCompact(primary.totalDps)} caption={primary.name} tone="accent" />
        ) : null}
        <Tile
          label="Resistances"
          caption={uncapped ? `${uncapped} below cap` : 'all capped'}
        >
          <div className="mt-1.5 grid grid-cols-4 gap-1">
            {defense.resistances.map((r) => (
              <div key={r.type} className="min-w-0" title={`${r.type} ${r.value}% of ${r.max}%`}>
                <div
                  className={`tabular text-sm leading-none font-semibold ${r.capped ? 'text-ink' : 'text-danger'}`}
                >
                  {r.value}
                </div>
                <div className={`mt-1 h-1 rounded-full ${r.capped ? RES_COLOR[r.type] : 'bg-danger'}`} />
                <div className="mt-1 truncate text-[10px] text-ink-mute">{RES_LABEL[r.type] ?? r.type}</div>
              </div>
            ))}
          </div>
        </Tile>
        {spiritTotal !== null ? (
          <Tile
            label="Spirit"
            value={fmt(spiritTotal)}
            caption={spirit ? `${fmt(spirit.unreserved)} unreserved` : null}
          />
        ) : null}
      </div>
    </section>
  )
}
