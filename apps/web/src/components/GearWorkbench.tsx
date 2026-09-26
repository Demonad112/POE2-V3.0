'use client'

/**
 * Gear workbench — "replace first" and "gear modifiers" in one place.
 *
 * Items are listed in replace-first order. Open one and each affix can be
 * removed, set to another tier, or swapped for a different affix; open slots
 * can be filled. Every change lands in one draft across all items, and the
 * resistance strip at the top shows what the draft does: take +38% fire off a
 * helmet and fire drops below cap there; raise a ring's fire from T3 to T1 and
 * it climbs back.
 *
 * A changed or added line counts at the bottom of its range, so a draft that
 * caps here caps in game. The draft is a sketch — nothing is saved until
 * "Plan a full replacement" puts an item on the shopping list.
 */

import { useMemo, useState } from 'react'
import { useGearDraft } from '@/lib/useGearDraft'
import {
  CANDIDATE_GROUP_LABEL,
  EMPTY_DRAFT,
  OCCUPIES_AFFIX_SLOT,
  analyzeItem,
  draftResistances,
  draftSize,
  draftStatDelta,
  lineKey,
  openSlots,
  rankAffixCandidates,
  rankReplacements,
  stripModMarkup,
  tierOptions,
  type AffixKind,
  type DefenseSummary,
  type DraftResistance,
  type EquippedItem,
  type GearDraft,
  type ItemAnalysis,
  type ItemModAnalysis,
  type LineEdit,
  type ModTiers,
  type ReplacementPriority,
} from '@poe2/core'
import type { ModTiersState } from '@/lib/useModTiers'
import { useShoppingList } from '@/hooks/useShoppingList'
import { ReplacementPlanner } from './ReplacementPlanner'
import { Empty, Panel, Tag } from './ui'

const DMG_VAR: Record<string, string> = {
  fire: 'var(--dmg-fire)',
  cold: 'var(--dmg-cold)',
  lightning: 'var(--dmg-lightning)',
  chaos: 'var(--dmg-chaos)',
}

const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1)

function modText(tiers: ModTiers, modId: string): string {
  const raw = tiers.raw(modId)
  return stripModMarkup(raw?.text ?? raw?.name ?? modId)
}

function tierLabel(tiers: ModTiers, item: ItemAnalysis, modId: string): string {
  const options = tierOptions(tiers, item, modId)
  const at = options.find((o) => o.entry.id === modId)
  return at ? `T${at.entry.tier}/${options.length}` : '—'
}

// --- resistance strip ---------------------------------------------------------

function ResistanceStrip({
  rows,
  changes,
  onReset,
}: {
  rows: DraftResistance[]
  changes: number
  onReset: () => void
}) {
  return (
    <div className="sticky top-16 z-10 rounded-lg border border-line bg-surface-raised/95 p-2 shadow-[var(--lift)] backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium tracking-wider text-ink-dim uppercase">
          Resistances {changes ? 'after changes' : 'now'}
        </span>
        {changes ? (
          <button
            type="button"
            onClick={onReset}
            className="rounded border border-line px-1.5 py-px text-[10px] text-ink-dim transition-colors hover:border-accent-line hover:text-ink"
          >
            {changes} change{changes === 1 ? '' : 's'} · reset
          </button>
        ) : (
          <span className="text-[10px] text-ink-mute">uncapped / cap</span>
        )}
      </div>
      <ul className="grid grid-cols-4 gap-1">
        {rows.map((r) => {
          const short = r.underCapAfter > 0
          return (
            <li
              key={r.type}
              title={`${cap(r.type)}: ${r.before} before, ${r.after} after, cap ${r.maxAfter}`}
              className={`min-w-0 rounded-md border px-1.5 py-1 ${short ? 'border-danger/45 bg-danger/10' : 'border-line/70 bg-surface-sunken/70'}`}
            >
              <div className="flex items-center gap-1 text-[10px] text-ink-dim">
                <span aria-hidden className="inline-block size-1.5 shrink-0 rounded-[1px]" style={{ background: DMG_VAR[r.type] }} />
                <span className="truncate">{cap(r.type)}</span>
              </div>
              <div className="tabular flex items-baseline gap-0.5 text-sm leading-tight font-semibold">
                <span className={short ? 'text-danger' : 'text-ink'}>{r.after}</span>
                <span className="text-[10px] font-normal text-ink-mute">/{r.maxAfter}</span>
              </div>
              <div className={`tabular truncate text-[10px] leading-tight ${short ? 'text-danger' : 'text-ink-mute'}`}>
                {short ? `−${r.underCapAfter}` : r.overCapAfter ? `+${r.overCapAfter}` : 'capped'}
                {r.changed ? <span className="text-ink-mute"> · was {r.before}</span> : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// --- affix picker ---------------------------------------------------------------

function AffixPicker({
  tiers,
  item,
  kind,
  draft,
  resistances,
  replacing,
  onPick,
  onClose,
}: {
  tiers: ModTiers
  item: ItemAnalysis
  kind: AffixKind
  draft: GearDraft
  resistances: DraftResistance[]
  replacing: number | null
  onPick: (modId: string) => void
  onClose: () => void
}) {
  const [all, setAll] = useState(false)
  const list = useMemo(
    () => rankAffixCandidates({ tiers, item, kind, draft, resistances, replacing }),
    [tiers, item, kind, draft, resistances, replacing],
  )
  const shown = all ? list : list.slice(0, 10)

  return (
    <div className="mt-1.5 rounded-lg border border-accent-line bg-surface p-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-ink">
          {replacing !== null ? 'Swap for' : 'Add'} a {kind}
        </span>
        <button type="button" onClick={onClose} className="text-[11px] text-ink-mute hover:text-ink">
          Close
        </button>
      </div>
      <p className="mb-1.5 text-[10px] leading-relaxed text-ink-mute">
        Ranked: fixes a resistance you&apos;d be short on → item rarity → defences → damage → attributes → the rest.
        Best tier this item level can roll, counted at the bottom of its range.
      </p>
      {shown.length ? (
        <ol className="space-y-0.5">
          {shown.map((c, i) => (
            <li key={c.entry.id}>
              <button
                type="button"
                onClick={() => onPick(c.entry.id)}
                className="grid w-full grid-cols-[1.25rem_2.75rem_1fr] items-baseline gap-x-1.5 rounded px-1.5 py-1 text-left transition-colors hover:bg-surface-raised"
              >
                <span className="tabular text-[10px] text-ink-mute">{i + 1}</span>
                <span className="tabular text-[11px] font-semibold text-good">
                  T{c.entry.tier}/{c.ladderLength}
                </span>
                <span className="min-w-0">
                  <span className="text-xs text-ink">{stripModMarkup(c.entry.text ?? c.entry.affix ?? c.entry.id)}</span>
                  <span className="ml-1.5 inline-flex flex-wrap gap-1 align-middle">
                    <Tag tone={c.group === 'shortfall' ? 'good' : c.group === 'rarity' ? 'accent' : 'default'}>
                      {CANDIDATE_GROUP_LABEL[c.group]}
                    </Tag>
                    {c.closes.map((x) => (
                      <span key={x.type} className="text-[10px] text-good">
                        closes {x.points}% {x.type}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[11px] text-ink-mute">Nothing else of this kind can roll on this base at this item level.</p>
      )}
      {list.length > 10 ? (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-1 text-[11px] text-accent hover:underline">
          {all ? 'Show top 10' : `Show all ${list.length}`}
        </button>
      ) : null}
    </div>
  )
}

// --- one line -------------------------------------------------------------------

function ModLine({
  mod,
  item,
  tiers,
  edit,
  editable,
  onEdit,
  onSwap,
}: {
  mod: ItemModAnalysis
  item: ItemAnalysis
  tiers: ModTiers
  edit: LineEdit | undefined
  editable: boolean
  onEdit: (edit: LineEdit | null) => void
  onSwap: () => void
}) {
  const removed = edit?.kind === 'remove'
  const set = edit?.kind === 'set' ? edit.modId : null
  const currentId = set ?? mod.id
  const options = editable && currentId ? tierOptions(tiers, item, currentId) : []
  const sameLadder = set !== null && mod.id !== null && options.some((o) => o.entry.id === mod.id)
  const reachable = mod.upgrades.find((u) => u.reachableOnThisItem)

  return (
    <li
      className={`rounded-md px-2 py-1.5 ${
        edit ? 'bg-accent-soft ring-1 ring-accent-line' : mod.waste ? 'bg-warn/10 ring-1 ring-warn/30' : 'odd:bg-surface-sunken/50'
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`tabular w-11 shrink-0 pt-px text-[11px] font-semibold ${
            removed ? 'text-ink-mute' : mod.tier === 1 && !set ? 'text-good' : 'text-ink-dim'
          }`}
        >
          {set ? tierLabel(tiers, item, set) : mod.tier !== null ? `T${mod.tier}/${mod.tiers}` : mod.source === 'explicit' ? '—' : mod.source}
        </span>
        <div className="min-w-0 flex-1">
          {set ? (
            <>
              <div className="text-xs text-accent">{modText(tiers, set)}</div>
              <div className="text-[10px] text-ink-mute line-through">{mod.text}</div>
            </>
          ) : (
            <div className={`text-xs ${removed ? 'text-ink-mute line-through' : editable ? 'text-ink' : 'text-ink-dim'}`}>
              {mod.text}
            </div>
          )}
          {!edit && mod.waste ? <p className="mt-0.5 text-[11px] leading-snug text-warn">{mod.waste.reason}</p> : null}
          {!edit && reachable ? (
            <p className="mt-0.5 text-[11px] text-ink-mute">
              <span className="text-good">T{reachable.tier} can roll on this item</span>
              {reachable.gain !== null ? ` — up to ${reachable.gain} more` : ''}
            </p>
          ) : null}
        </div>
      </div>

      {editable ? (
        <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-[3.25rem]">
          {edit ? (
            <button
              type="button"
              onClick={() => onEdit(null)}
              className="rounded border border-line px-1.5 py-0.5 text-[11px] text-ink-dim hover:text-ink"
            >
              Undo
            </button>
          ) : null}
          {!removed && options.length > 1 && (set === null || sameLadder) ? (
            <label className="inline-flex items-center gap-1 text-[11px] text-ink-mute">
              <span className="sr-only">Tier</span>
              <select
                value={currentId ?? ''}
                onChange={(e) => onEdit(e.target.value === mod.id ? null : { kind: 'set', modId: e.target.value })}
                className="rounded border border-line bg-surface px-1 py-0.5 text-[11px] text-ink"
              >
                {options.map((o) => {
                  const first = o.entry.stats[0]
                  return (
                    <option key={o.entry.id} value={o.entry.id} disabled={!o.reachable}>
                      T{o.entry.tier}
                      {first ? ` · ${first.min}–${first.max}` : ''}
                      {o.entry.id === mod.id ? ' (yours)' : ''}
                      {o.reachable ? '' : ` · ilvl ${o.entry.ilvl}`}
                    </option>
                  )
                })}
              </select>
            </label>
          ) : null}
          {!removed ? (
            <>
              <button
                type="button"
                onClick={onSwap}
                className="rounded border border-line px-1.5 py-0.5 text-[11px] text-ink-dim hover:border-accent-line hover:text-accent"
              >
                Swap…
              </button>
              <button
                type="button"
                onClick={() => onEdit({ kind: 'remove' })}
                className="rounded border border-line px-1.5 py-0.5 text-[11px] text-ink-dim hover:border-danger/50 hover:text-danger"
                aria-label={`Remove ${mod.text}`}
              >
                Remove
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

// --- one item -------------------------------------------------------------------

interface Shared {
  tiers: ModTiers
  draft: GearDraft
  setDraft: (next: GearDraft) => void
  resistances: DraftResistance[]
  analysed: ItemAnalysis[]
  items: EquippedItem[]
  defense: DefenseSummary
  characterName: string
  attributes?: Partial<Record<'str' | 'dex' | 'int', number>>
}

function ItemRow({ item, row, saved, shared }: { item: ItemAnalysis; row: ReplacementPriority; saved: boolean; shared: Shared }) {
  const { tiers, draft, setDraft, resistances } = shared
  const [open, setOpen] = useState(false)
  const [picker, setPicker] = useState<{ kind: AffixKind; replacing: number | null } | null>(null)
  const [planning, setPlanning] = useState(false)

  const edits = item.mods.filter((_, i) => draft.edits[lineKey(item.slotId, i)]).length
  const added = draft.added.filter((a) => a.slotId === item.slotId)
  const slots = openSlots(item, draft, tiers)
  const wasted = item.mods.filter((m) => m.waste).length
  const upgradable = item.mods.filter((m) => m.upgrades.some((u) => u.reachableOnThisItem)).length

  const setEdit = (i: number, edit: LineEdit | null) => {
    const edits = { ...draft.edits }
    if (edit) edits[lineKey(item.slotId, i)] = edit
    else delete edits[lineKey(item.slotId, i)]
    setDraft({ ...draft, edits })
  }
  const pick = (modId: string) => {
    if (!picker) return
    if (picker.replacing !== null) setEdit(picker.replacing, { kind: 'set', modId })
    else
      setDraft({
        ...draft,
        added: [...draft.added, { key: `${item.slotId}:+${Date.now()}`, slotId: item.slotId, modId }],
      })
    setPicker(null)
  }

  return (
    <li className={`rounded-lg border bg-surface ${edits + added.length ? 'border-accent-line' : 'border-line'}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[1.75rem_1fr_auto] items-start gap-x-2 px-3 py-2.5 text-left"
      >
        <span className="tabular pt-px text-xs font-semibold text-accent">{row.rank !== null ? `#${row.rank}` : '—'}</span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink">{item.name}</span>
          <span className="block text-[11px] text-ink-mute">
            {item.slotLabel} · {item.baseType}
            {item.itemLevel !== null ? ` · ilvl ${item.itemLevel}` : ''}
          </span>
          <span className="mt-1 flex flex-wrap gap-1">
            {edits + added.length ? <Tag tone="accent">{edits + added.length} edited</Tag> : null}
            {saved ? <Tag tone="good">on shopping list</Tag> : null}
            {item.corrupted ? <Tag tone="danger">corrupted</Tag> : null}
            {wasted ? <Tag tone="warn">{wasted} over cap</Tag> : null}
            {upgradable ? <Tag>{upgradable} can tier up</Tag> : null}
            {slots && slots.prefix + slots.suffix > 0 ? <Tag tone="good">{slots.prefix + slots.suffix} open</Tag> : null}
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className={`mt-1 size-3.5 text-ink-mute transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-line px-2.5 py-2.5">
          {row.reasons.length ? (
            <p className="px-1 text-[11px] leading-relaxed text-ink-mute">
              <span className="text-ink-dim">Why #{row.rank ?? '—'}:</span> {row.reasons.join(' · ')}
            </p>
          ) : null}

          <ul className="space-y-1">
            {item.mods.map((mod, i) => {
              const editable =
                !item.corrupted && mod.id !== null && mod.kind !== null && OCCUPIES_AFFIX_SLOT.has(mod.source) && mod.tier !== null
              return (
                <ModLine
                  key={`${mod.id ?? 'text'}-${i}`}
                  mod={mod}
                  item={item}
                  tiers={tiers}
                  edit={draft.edits[lineKey(item.slotId, i)]}
                  editable={editable}
                  onEdit={(e) => setEdit(i, e)}
                  onSwap={() => setPicker({ kind: mod.kind!, replacing: i })}
                />
              )
            })}
            {added.map((a) => (
              <li key={a.key} className="flex items-start gap-2 rounded-md bg-accent-soft px-2 py-1.5 ring-1 ring-accent-line">
                <span className="tabular w-11 shrink-0 text-[11px] font-semibold text-good">{tierLabel(tiers, item, a.modId)}</span>
                <span className="min-w-0 flex-1 text-xs text-accent">{modText(tiers, a.modId)}</span>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, added: draft.added.filter((x) => x.key !== a.key) })}
                  className="rounded border border-line px-1.5 py-0.5 text-[11px] text-ink-dim hover:text-ink"
                >
                  Undo
                </button>
              </li>
            ))}
          </ul>

          {picker ? (
            <AffixPicker
              tiers={tiers}
              item={item}
              kind={picker.kind}
              draft={draft}
              resistances={resistances}
              replacing={picker.replacing}
              onPick={pick}
              onClose={() => setPicker(null)}
            />
          ) : null}

          {slots && slots.prefix + slots.suffix > 0 && !picker ? (
            <div className="flex flex-wrap gap-1.5 px-1">
              {(['prefix', 'suffix'] as const).map((kind) =>
                slots[kind] > 0 ? (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setPicker({ kind, replacing: null })}
                    className="rounded-md border border-dashed border-good/50 px-2 py-0.5 text-[11px] text-good hover:bg-good/10"
                  >
                    + Add {kind} ({slots[kind]} open)
                  </button>
                ) : null,
              )}
            </div>
          ) : null}

          {item.warnings.map((w) => (
            <p key={w} className="px-1 text-[11px] text-ink-mute">
              {w}
            </p>
          ))}

          <div className="px-1">
            <button
              type="button"
              onClick={() => setPlanning((v) => !v)}
              aria-expanded={planning}
              className="rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20"
            >
              {planning ? 'Hide replacement plan' : 'Plan a full replacement →'}
            </button>
            {planning ? (
              <ReplacementPlanner
                target={item}
                analysed={shared.analysed}
                items={shared.items}
                defense={shared.defense}
                tiers={tiers}
                characterName={shared.characterName}
                {...(shared.attributes ? { attributes: shared.attributes } : {})}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  )
}

// --- panel ----------------------------------------------------------------------

export function GearWorkbench({
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

  const base = useMemo(() => {
    if (state.status !== 'ready') return null
    const active = items.filter((i) => i.active)
    const analysed = active.map((i) => analyzeItem(i, state.tiers, defense))
    return { active, analysed, ranking: rankReplacements(analysed, defense) }
  }, [state, items, defense])

  const { draft, setDraft, dropped } = useGearDraft(
    characterName,
    base?.analysed ?? null,
    state.status === 'ready' ? state.tiers : null,
  )

  const resistances = useMemo(
    () => (base && state.status === 'ready' ? draftResistances(defense, draftStatDelta(base.analysed, draft, state.tiers)) : []),
    [base, state, defense, draft],
  )

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <Panel title="Gear workbench" subtitle="Loading the affix data…" bare={bare}>
        <div className="h-24 animate-pulse rounded-lg bg-surface-sunken" />
      </Panel>
    )
  }
  if (state.status === 'error' || !base) {
    return (
      <Panel title="Gear workbench" bare={bare}>
        <Empty>The affix data didn&apos;t load, so modifiers can&apos;t be tiered or edited.</Empty>
      </Panel>
    )
  }
  if (!base.analysed.length) {
    return (
      <Panel title="Gear workbench" bare={bare}>
        <Empty>No equipped items to analyse.</Empty>
      </Panel>
    )
  }

  const shared: Shared = {
    tiers: state.tiers,
    draft,
    setDraft,
    resistances,
    analysed: base.analysed,
    items: base.active,
    defense,
    characterName,
    ...(attributes ? { attributes } : {}),
  }
  const savedSlots = new Set(
    shopping.entries.filter((e) => e.characterName === characterName && !e.done).map((e) => e.slotLabel),
  )
  const bySlot = new Map(base.analysed.map((i) => [i.slotId, i]))
  const rows = [...base.ranking.ranked, ...base.ranking.unranked]

  return (
    <Panel
      title="Gear workbench"
      subtitle="Items in replace-first order. Open one to remove an affix, change its tier or swap it — the resistance strip shows the result across all your gear."
      bare={bare}
    >
      <div className="space-y-3">
        <ResistanceStrip rows={resistances} changes={draftSize(draft)} onReset={() => setDraft(EMPTY_DRAFT)} />
        {dropped > 0 ? (
          <p role="status" className="rounded-md border border-warn/40 px-2.5 py-1.5 text-[11px] leading-relaxed text-warn">
            {dropped} saved change{dropped === 1 ? '' : 's'} no longer matched your gear and {dropped === 1 ? 'was' : 'were'}{' '}
            dropped — the line or item changed since you drafted it.
          </p>
        ) : null}
        <p className="text-[11px] leading-relaxed text-ink-mute">
          {base.ranking.orderedBy} Uniques are listed last, unranked — their value is the unique effect. Changed lines
          count at the bottom of their range. Your changes are saved in this browser for {characterName}.
        </p>
        <ol className="space-y-1.5">
          {rows.map((row) => {
            const item = bySlot.get(row.slotId)
            return item ? <ItemRow key={row.slotId} item={item} row={row} saved={savedSlots.has(row.slotLabel)} shared={shared} /> : null
          })}
        </ol>
      </div>
    </Panel>
  )
}
