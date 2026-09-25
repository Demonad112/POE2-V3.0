'use client'

/**
 * "What should replace this item?" — inside each gear card.
 *
 * Shows the spec (what to look for, best tier this base can hold), what the
 * current item holds up, and the ordered follow-ups when a resistance would
 * drop below cap: Step 1 is the replacement, Step 2+ are the upgrades on other
 * items that make up the difference.
 *
 * The player can leave a resistance off the replacement (they want that suffix
 * for something else, or are swapping in a unique) and the follow-ups recompute.
 * Other bases for the slot can be compared against the spec, and the plan can
 * be saved to the gear shopping list shown on the checklist.
 */

import { useMemo, useState } from 'react'
import {
  planReplacement,
  type DefenseSummary,
  type EquippedItem,
  type ItemAnalysis,
  type ModTiers,
  type SpecLine,
} from '@poe2/core'
import { Tag } from './ui'
import { AlternativeBases } from './AlternativeBases'
import { useShoppingList } from '@/hooks/useShoppingList'

const WHY: Record<SpecLine['why'], { label: string; tone: 'good' | 'accent' | 'warn' }> = {
  'needed-resistance': { label: 'keeps you capped', tone: 'warn' },
  'existing-shortfall': { label: 'fixes a current shortfall', tone: 'accent' },
  upgrade: { label: 'better tier', tone: 'good' },
  keep: { label: 'already at best tier', tone: 'accent' },
}

export function ReplacementPlanner({
  target,
  analysed,
  items,
  defense,
  tiers,
  characterName = '',
  attributes,
}: {
  target: ItemAnalysis
  analysed: ItemAnalysis[]
  items: EquippedItem[]
  defense: DefenseSummary
  tiers: ModTiers
  /** Names the saved shopping-list entry. */
  characterName?: string
  /** From the PoB export, when present — checks the other bases' requirements. */
  attributes?: Partial<Record<'str' | 'dex' | 'int', number>>
}) {
  const [omit, setOmit] = useState<string[]>([])
  const [cap82, setCap82] = useState(false)
  const shopping = useShoppingList()
  const saved = shopping.entries.some((e) => e.characterName === characterName && e.slotLabel === target.slotLabel)

  const plan = useMemo(
    () =>
      planReplacement({
        target,
        items: analysed,
        rawItems: items,
        defense,
        tiers,
        omitResistances: omit,
        ...(cap82 ? { maxIlvl: 82 } : {}),
      }),
    [target, analysed, items, defense, tiers, omit, cap82],
  )

  const holding = plan.resistances.filter((r) => r.deficitIfRemoved > 0)
  const toggle = (type: string) =>
    setOmit((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-xs font-semibold text-ink">
          Replacing {plan.itemName}
          <span className="ml-2 font-normal text-ink-mute">
            {plan.baseType}
            {plan.ilvlNeeded !== null ? ` · item level ${plan.ilvlNeeded}+ for every line below` : ''}
          </span>
        </h4>
        <label className="flex items-center gap-1.5 text-[11px] text-ink-mute">
          <input
            type="checkbox"
            checked={cap82}
            onChange={(e) => setCap82(e.target.checked)}
            className="size-3 accent-emerald-500"
          />
          Cap at item level 82
        </label>
      </div>

      {plan.notes.length ? (
        <ul className="space-y-0.5 text-[11px] text-ink-mute">
          {plan.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      {/* What this item holds up */}
      {plan.resistances.length ? (
        <div>
          <p className="mb-1 text-[11px] font-medium tracking-wide text-ink-dim uppercase">What this item holds up</p>
          <ul className="flex flex-wrap gap-1.5">
            {plan.resistances.map((r) => (
              <li
                key={r.type}
                className={`rounded-md border px-2 py-1 text-[11px] ${
                  r.deficitIfRemoved > 0 ? 'border-warn/40 bg-warn/10 text-warn' : 'border-line text-ink-mute'
                }`}
              >
                <span className="font-medium capitalize">{r.type}</span> {r.fromItem}% ·{' '}
                {r.deficitIfRemoved > 0
                  ? `drops ${r.deficitIfRemoved}% below cap without it`
                  : `stays capped without it (${r.uncapped}% before cap)`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {holding.length ? (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-mute">
          <span>Leave off the replacement:</span>
          {holding.map((r) => (
            <button
              key={r.type}
              type="button"
              aria-pressed={omit.includes(r.type)}
              onClick={() => toggle(r.type)}
              className={`rounded border px-1.5 py-0.5 capitalize transition-colors ${
                omit.includes(r.type)
                  ? 'border-danger/50 bg-danger/10 text-danger'
                  : 'border-line text-ink-dim hover:border-accent/40'
              }`}
            >
              {omit.includes(r.type) ? '✕ ' : ''}
              {r.type}
            </button>
          ))}
        </div>
      ) : null}

      {/* Step 1: the replacement */}
      <div>
        <p className="mb-1 text-[11px] font-medium tracking-wide text-ink-dim uppercase">
          Step 1 — look for a {plan.baseType} with
        </p>
        {plan.spec.length ? (
          <ul className="space-y-1">
            {plan.spec.map((line) => (
              <li key={`${line.kind}-${line.statId}-${line.affix}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md bg-surface px-2 py-1">
                <span className="tabular w-10 shrink-0 text-[11px] font-semibold text-good">
                  T{line.tier}/{line.tiers}
                </span>
                <span className="min-w-0 flex-1 text-xs text-ink">{line.text ?? line.affix}</span>
                <span className="text-[10px] text-ink-mute">
                  {line.kind}
                  {line.current !== null ? ` · yours ${line.current}` : ''} · ilvl {line.ilvl}
                </span>
                <Tag tone={WHY[line.why].tone}>{WHY[line.why].label}</Tag>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-ink-mute">No lines could be resolved for this base.</p>
        )}
        {plan.dropped.length ? (
          <ul className="mt-1.5 space-y-0.5">
            {plan.dropped.map((d) => (
              <li key={d.text} className="text-[11px] text-ink-mute">
                <span className="text-ink-dim line-through decoration-ink-mute/50">{d.text}</span> — {d.reason}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Steps 2+: make up what the replacement doesn't cover */}
      {plan.followUps.length || plan.uncovered.length ? (
        <div>
          <p className="mb-1 text-[11px] font-medium tracking-wide text-ink-dim uppercase">
            Then, to stay capped
          </p>
          <ol className="space-y-1">
            {plan.followUps.map((f) => (
              <li key={`${f.step}-${f.itemName}`} className="rounded-md border border-line bg-surface px-2 py-1.5 text-xs">
                <span className="mr-1.5 font-semibold text-accent">Step {f.step + 1}</span>
                {f.action === 'upgrade-tier' ? (
                  <>
                    Upgrade <span className="capitalize">{f.type}</span> resistance on{' '}
                    <span className="font-medium text-ink">{f.itemName}</span>{' '}
                    <span className="text-ink-mute">({f.slotLabel})</span>: T{f.from?.tier} {f.from?.value}% → T{f.to.tier}{' '}
                    {f.to.min}–{f.to.max}%
                  </>
                ) : (
                  <>
                    Craft <span className="capitalize">{f.type}</span> resistance into the open suffix on{' '}
                    <span className="font-medium text-ink">{f.itemName}</span>{' '}
                    <span className="text-ink-mute">({f.slotLabel})</span>: T{f.to.tier} {f.to.min}–{f.to.max}%
                  </>
                )}
                <span className="ml-1.5 text-[11px] text-good">covers {f.closes}%</span>
              </li>
            ))}
          </ol>
          {plan.uncovered.map((u) => (
            <p key={u.type} className="mt-1 text-[11px] text-danger">
              Still {u.points}% short on <span className="capitalize">{u.type}</span> after these — it needs another
              source: a suffix on a different item, a rune, or passives.
            </p>
          ))}
          <p className="mt-1 text-[10px] text-ink-mute">
            Follow-ups assume the replacement rolls the bottom of each range, so they&apos;re never undersized.
          </p>
        </div>
      ) : holding.length ? (
        <p className="text-[11px] text-good">
          The replacement covers everything this item holds up — no other item needs to change.
        </p>
      ) : null}

      <AlternativeBases plan={plan} tiers={tiers} {...(cap82 ? { maxIlvl: 82 } : {})} {...(attributes ? { attributes } : {})} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => shopping.save(plan, characterName)}
          className="rounded-md border border-good/40 bg-good/10 px-2.5 py-1 text-[11px] font-medium text-good transition-colors hover:bg-good/20"
        >
          {saved ? 'Update on shopping list' : 'Save to shopping list'}
        </button>
        {saved ? (
          <span className="text-[10px] text-ink-mute">Saved — it&apos;s on the checklist page under Gear shopping list.</span>
        ) : null}
      </div>

      {plan.existingShortfalls.length ? (
        <p className="text-[11px] text-ink-mute">
          Already short before this swap:{' '}
          {plan.existingShortfalls
            .map((s) => `${s.type} ${s.points}%${s.placedInSpec ? ' (added to the spec above)' : ''}`)
            .join(', ')}
          . See Resistance rebalancing below.
        </p>
      ) : null}
    </div>
  )
}
