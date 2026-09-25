'use client'

/**
 * "Which item should I replace first?" — the gear ranked by what a replacement
 * would recover, every reason stated, each row opening the replacement planner.
 */

import { useMemo, useState } from 'react'
import {
  analyzeItem,
  rankReplacements,
  type DefenseSummary,
  type EquippedItem,
  type ItemAnalysis,
  type ModTiers,
  type ReplacementPriority,
} from '@poe2/core'
import type { ModTiersState } from '@/lib/useModTiers'
import { useShoppingList } from '@/hooks/useShoppingList'
import { ReplacementPlanner } from './ReplacementPlanner'
import { Empty, Panel, Tag } from './ui'

interface Context {
  analysed: ItemAnalysis[]
  items: EquippedItem[]
  defense: DefenseSummary
  tiers: ModTiers
  characterName: string
  attributes?: Partial<Record<'str' | 'dex' | 'int', number>>
}

function cost(r: ReplacementPriority): string | null {
  const parts = Object.entries(r.removalCost).map(([type, points]) => `${type} ${points}%`)
  return parts.length ? `Taking it off drops ${parts.join(', ')} below cap — the replacement plan shows how to make that up.` : null
}

function Row({ row, context, saved }: { row: ReplacementPriority; context: Context; saved: boolean }) {
  const [planning, setPlanning] = useState(false)
  const target = context.analysed.find((i) => i.slotId === row.slotId)
  const removal = cost(row)

  return (
    <li className="rounded-lg border border-line bg-surface px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="min-w-0">
          {row.rank !== null ? (
            <span className="tabular mr-2 text-xs font-semibold text-accent">#{row.rank}</span>
          ) : null}
          <span className="text-xs font-medium text-ink">{row.itemName}</span>
          <span className="ml-2 text-[11px] text-ink-mute">
            {row.slotLabel} · {row.baseType}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {saved ? <Tag tone="good">on shopping list</Tag> : null}
          {row.corrupted ? <Tag tone="danger">corrupted</Tag> : null}
        </span>
      </div>
      {row.reasons.length ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] text-ink-dim">
          {row.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[11px] text-ink-mute">Nothing measurable to gain — every line is at the top of its ladder.</p>
      )}
      {removal ? <p className="mt-1 text-[10px] text-ink-mute">{removal}</p> : null}
      {target ? (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setPlanning((v) => !v)}
            aria-expanded={planning}
            className="rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20"
          >
            {planning ? 'Hide replacement plan' : 'Plan a replacement →'}
          </button>
          {planning ? (
            <ReplacementPlanner
              target={target}
              analysed={context.analysed}
              items={context.items}
              defense={context.defense}
              tiers={context.tiers}
              characterName={context.characterName}
              {...(context.attributes ? { attributes: context.attributes } : {})}
            />
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

export function ReplaceFirstPanel({
  items,
  defense,
  state,
  characterName,
  attributes,
  bare = false,
}: {
  items: EquippedItem[]
  defense: DefenseSummary
  state: ModTiersState
  characterName: string
  attributes?: Partial<Record<'str' | 'dex' | 'int', number>>
  bare?: boolean
}) {
  const shopping = useShoppingList()
  const result = useMemo(() => {
    if (state.status !== 'ready') return null
    const active = items.filter((i) => i.active)
    const analysed = active.map((i) => analyzeItem(i, state.tiers, defense))
    return {
      ranking: rankReplacements(analysed, defense),
      context: {
        analysed,
        items: active,
        defense,
        tiers: state.tiers,
        characterName,
        ...(attributes ? { attributes } : {}),
      } satisfies Context,
    }
  }, [state, items, defense, characterName, attributes])

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <Panel title="Replace first" subtitle="Loading the affix data…" bare={bare}>
        <div className="h-24 animate-pulse rounded-lg bg-surface-sunken" />
      </Panel>
    )
  }
  if (state.status === 'error' || !result) {
    return (
      <Panel title="Replace first" bare={bare}>
        <Empty>The affix data didn&apos;t load, so items can&apos;t be ranked.</Empty>
      </Panel>
    )
  }

  const { ranking, context } = result
  const savedSlots = new Set(
    shopping.entries.filter((e) => e.characterName === characterName && !e.done).map((e) => e.slotLabel),
  )

  return (
    <Panel title="Replace first" subtitle={ranking.orderedBy} bare={bare}>
      {ranking.ranked.length ? (
        <ol className="space-y-1.5">
          {ranking.ranked.map((row) => (
            <Row key={row.slotId} row={row} context={context} saved={savedSlots.has(row.slotLabel)} />
          ))}
        </ol>
      ) : (
        <Empty>No rare or magic items to rank.</Empty>
      )}
      {ranking.unranked.length ? (
        <div className="mt-3">
          <p className="mb-1 text-[11px] font-medium tracking-wide text-ink-dim uppercase">Uniques — not ranked</p>
          <p className="mb-1.5 text-[11px] text-ink-mute">
            A unique is worth its unique effect, which none of these counts measure. Planning a replacement still shows
            what it holds up.
          </p>
          <ul className="space-y-1.5">
            {ranking.unranked.map((row) => (
              <Row key={row.slotId} row={row} context={context} saved={savedSlots.has(row.slotLabel)} />
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  )
}
