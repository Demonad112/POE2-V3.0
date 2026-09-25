'use client'

/**
 * Damage review for one skill: which support gems to change, and which gear
 * modifiers to upgrade or craft for more damage.
 *
 * Gem values come from Path of Building 2's support data (each gem's own
 * constant "more" figures, weighed against this skill's damage split). Gear
 * findings come from the affix ladders. Neither is a DPS simulation, and the
 * panel says so rather than dressing the numbers up as one.
 */

import { useMemo, useState } from 'react'
import {
  analyzeItem,
  parseAllSetups,
  reviewDamage,
  type CharModel,
  type DefenseSummary,
  type DpsSummary,
  type EquippedItem,
  type GemCandidate,
} from '@poe2/core'
import type { ModTiersState } from '@/lib/useModTiers'
import type { SupportCatalogState } from '@/lib/useSupportCatalog'
import { Empty, Panel, Tag } from './ui'

function pct(ratio: number): string {
  const p = (ratio - 1) * 100
  return `${p >= 0 ? '+' : ''}${p.toFixed(p < 10 ? 1 : 0)}%`
}

function CandidateRow({ c, ratio }: { c: GemCandidate; ratio?: number }) {
  return (
    <li className="rounded-md bg-surface px-2 py-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-xs font-medium text-ink">{c.name}</span>
        {c.lineage ? <Tag tone="accent">lineage</Tag> : null}
        <span className="tabular text-[11px] text-good">
          {ratio !== undefined ? `${pct(ratio)} DPS vs current` : `${pct(c.value.dps)} on its own`}
        </span>
      </div>
      {c.description ? <p className="mt-0.5 text-[11px] text-ink-mute">{c.description}</p> : null}
      {c.value.notes.length ? (
        <p className="mt-0.5 text-[10px] text-ink-mute">{c.value.notes.join(' · ')}</p>
      ) : null}
      {c.restriction ? <p className="mt-0.5 text-[11px] text-warn">Condition: {c.restriction}</p> : null}
      {c.tradeoffs.length ? (
        <p className="mt-0.5 text-[11px] text-warn">Trade-off: {c.tradeoffs.join(', ')}</p>
      ) : null}
      {c.conflicts.map((x) => (
        <p key={x} className="mt-0.5 text-[11px] text-danger">
          Clashes with your setup: {x}
        </p>
      ))}
    </li>
  )
}

export function DamageReview({
  dps,
  model,
  items,
  defense,
  tiersState,
  catalogState,
  bare = false,
}: {
  dps: DpsSummary
  model: CharModel
  items: EquippedItem[]
  defense: DefenseSummary
  tiersState: ModTiersState
  catalogState: SupportCatalogState
  bare?: boolean
}) {
  const damaging = dps.skills.filter((s) => s.totalDps > 0)
  const [skillName, setSkillName] = useState<string | undefined>(undefined)

  const review = useMemo(() => {
    if (catalogState.status !== 'ready') return null
    const active = items.filter((i) => i.active)
    const tiers = tiersState.status === 'ready' ? tiersState.tiers : null
    const analysed = tiers ? active.map((i) => analyzeItem(i, tiers, defense)) : []
    return reviewDamage({
      dps,
      setups: parseAllSetups(model.skills),
      items: analysed,
      rawItems: active,
      tiers,
      catalog: catalogState.catalog,
      ...(skillName ? { skillName } : {}),
    })
  }, [catalogState, tiersState, items, defense, dps, model, skillName])

  if (catalogState.status === 'idle' || catalogState.status === 'loading') {
    return (
      <Panel title="Damage review" subtitle="Loading Path of Building's support-gem data…" bare={bare}>
        <div className="h-24 animate-pulse rounded-lg bg-surface-sunken" />
      </Panel>
    )
  }
  if (catalogState.status === 'error') {
    return (
      <Panel title="Damage review" bare={bare}>
        <Empty>Could not load the support-gem data ({catalogState.message}).</Empty>
      </Panel>
    )
  }
  if (!review) {
    return (
      <Panel title="Damage review" bare={bare}>
        <Empty>No damaging skill to review.</Empty>
      </Panel>
    )
  }

  const bestSwap = review.gemSwaps[0]

  return (
    <Panel
      title="Damage review"
      subtitle="Gem values are each support's own figures from Path of Building 2, weighed against this skill's damage split — unconditional effects only. They're a guide to what to try, not a DPS simulation."
      bare={bare}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-dim">
          <label className="flex items-center gap-2">
            Skill
            <select
              value={skillName ?? review.skill}
              onChange={(e) => setSkillName(e.target.value)}
              className="rounded-md border border-line bg-surface-sunken px-2 py-1 text-ink"
            >
              {damaging.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} — {Math.round(s.totalDps).toLocaleString()} dps
                </option>
              ))}
            </select>
          </label>
          {review.dealt.length ? (
            <span className="text-ink-mute">
              deals {review.dealt.map((d) => `${d.percent}% ${d.type}`).join(', ')}
            </span>
          ) : null}
        </div>

        {/* Gems */}
        <section>
          <h3 className="mb-1.5 text-[11px] font-medium tracking-wide text-ink-dim uppercase">Support gems</h3>
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {review.supports.map((s) => (
              <li
                key={s.name}
                className={`rounded-md border px-2 py-1 text-[11px] ${
                  s.issue ? 'border-danger/40 bg-danger/10 text-danger' : 'border-line text-ink-dim'
                }`}
                title={s.issue ?? s.value?.notes.join(' · ') ?? ''}
              >
                {s.name}
                {s.value?.quantified && s.value.offensive && s.value.dps !== 1 ? (
                  <span className="tabular ml-1 text-good">{pct(s.value.dps)}</span>
                ) : s.value?.conditional.length ? (
                  <span className="ml-1 text-ink-mute">conditional</span>
                ) : s.value && !s.value.offensive ? (
                  <span className="ml-1 text-ink-mute">utility</span>
                ) : s.value && !s.value.quantified ? (
                  <span className="ml-1 text-ink-mute">increased</span>
                ) : null}
              </li>
            ))}
          </ul>

          {bestSwap ? (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-2.5">
              <p className="text-xs text-ink">
                Swap <span className="font-semibold">{bestSwap.replace.name}</span> for one of these.{' '}
                <span className="text-ink-mute">{bestSwap.reason}</span>
              </p>
              <ul className="mt-1.5 space-y-1">
                {bestSwap.candidates.map((c) => (
                  <CandidateRow key={c.name} c={c} ratio={c.ratio} />
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[11px] text-good">
              No compatible support beats the ones on this skill by the gems&apos; own figures.
            </p>
          )}

          {review.strongestCompatible.length ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-ink-mute">
                Strongest compatible supports you don&apos;t have ({review.strongestCompatible.length}) — including
                ones with conditions or clashes
              </summary>
              <ul className="mt-1.5 space-y-1">
                {review.strongestCompatible.map((c) => (
                  <CandidateRow key={c.name} c={c} />
                ))}
              </ul>
            </details>
          ) : null}
        </section>

        {/* Gear */}
        <section>
          <h3 className="mb-1.5 text-[11px] font-medium tracking-wide text-ink-dim uppercase">
            Gear changes for this skill
          </h3>
          {tiersState.status !== 'ready' ? (
            <p className="text-[11px] text-ink-mute">Waiting for the affix data…</p>
          ) : review.gear.length ? (
            <ul className="space-y-1">
              {review.gear.map((g, i) => (
                <li key={`${g.itemName}-${i}`} className="rounded-md bg-surface-sunken/50 px-2 py-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="tabular text-[11px] font-semibold text-ink-dim">
                      T{g.tier}→T{g.toTier}
                    </span>
                    <span className="min-w-0 flex-1 text-xs text-ink">{g.text}</span>
                    <Tag tone={g.reachableOnThisItem ? 'good' : 'warn'}>
                      {g.reachableOnThisItem ? 'on this item' : `needs ilvl ${g.ilvl} base`}
                    </Tag>
                  </div>
                  <div className="mt-0.5 text-[10px] text-ink-mute">
                    {g.itemName} · {g.slotLabel}
                    {g.gain !== null ? ` · up to ${g.gain} more` : ''} · {g.why}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-ink-mute">
              Every damage modifier scaling this skill is already at the best tier its item can hold.
            </p>
          )}

          {review.openSlots.length ? (
            <div className="mt-2">
              <p className="mb-1 text-[11px] text-ink-dim">Open slots that could take a damage line:</p>
              <ul className="space-y-1">
                {review.openSlots.map((o) => (
                  <li key={`${o.itemName}-${o.kind}`} className="text-[11px] text-ink-mute">
                    <span className="font-medium text-ink-dim">
                      {o.itemName} ({o.slotLabel}), open {o.kind}:
                    </span>{' '}
                    {o.options.map((x) => `${x.text ?? x.affix} (T${x.tier})`).join(' · ')}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {review.notes.length ? (
          <ul className="space-y-0.5 border-t border-line pt-2 text-[11px] text-ink-mute">
            {review.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </Panel>
  )
}
