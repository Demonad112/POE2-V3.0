/**
 * The gear shopping list: saved replacement plans, as plain snapshots.
 *
 * Pure functions over PersistedState so they can be tested without a browser;
 * `useShoppingList` wires them to storage.
 */

import type { ReplacementPlan } from '@poe2/core'
import type { PersistedState, ShoppingEntry } from './types'

export function entryFromPlan(plan: ReplacementPlan, characterName: string, now = new Date()): ShoppingEntry {
  return {
    id: `${characterName}::${plan.slotLabel}::${now.getTime()}`,
    characterName,
    slotLabel: plan.slotLabel,
    itemName: plan.itemName,
    baseType: plan.baseType,
    ilvlNeeded: plan.ilvlNeeded,
    lines: plan.spec.map((l) => `T${l.tier} ${l.text ?? l.affix ?? l.statId}`),
    followUps: plan.followUps.map((f) =>
      f.action === 'upgrade-tier'
        ? `${f.itemName} (${f.slotLabel}): ${f.type} resistance T${f.from?.tier} ${f.from?.value}% → T${f.to.tier} ${f.to.min}–${f.to.max}%`
        : `${f.itemName} (${f.slotLabel}): craft ${f.type} resistance into the open suffix, T${f.to.tier} ${f.to.min}–${f.to.max}%`,
    ),
    createdAt: now.toISOString(),
    done: false,
  }
}

/** One affix as the workbench would have it: its tier and the item level that tier needs. */
export interface DraftAffix {
  tier: number | null
  ilvl: number | null
  text: string
}

/** A workbench draft for one item, already resolved to text. */
export interface SlotDraft {
  slotLabel: string
  itemName: string
  baseType: string
  /** Lines the draft leaves alone, as shown on the item. */
  kept: string[]
  /** Lines the draft touches: `to: null` removes the line. */
  changed: { from: string; to: DraftAffix | null }[]
  added: DraftAffix[]
}

const affixLine = (a: DraftAffix) => (a.tier !== null ? `T${a.tier} ${a.text}` : a.text)

/**
 * A draft as a shopping entry: the lines the item ends up with, and the steps
 * that get it there. The item level is the highest any drafted tier needs —
 * null when the draft only removes lines.
 */
export function entryFromDraft(draft: SlotDraft, characterName: string, now = new Date()): ShoppingEntry {
  const targets = [...draft.changed.flatMap((c) => (c.to ? [c.to] : [])), ...draft.added]
  const levels = targets.flatMap((t) => (t.ilvl !== null ? [t.ilvl] : []))
  return {
    id: `${characterName}::${draft.slotLabel}::${now.getTime()}`,
    characterName,
    slotLabel: draft.slotLabel,
    itemName: draft.itemName,
    baseType: draft.baseType,
    ilvlNeeded: levels.length ? Math.max(...levels) : null,
    lines: [...draft.kept, ...targets.map(affixLine)],
    followUps: [
      ...draft.changed.map((c) => (c.to ? `Replace ${c.from} with ${affixLine(c.to)}` : `Remove ${c.from}`)),
      ...draft.added.map((a) => `Add ${affixLine(a)}`),
    ],
    createdAt: now.toISOString(),
    done: false,
    kind: 'draft',
  }
}

export function shoppingList(state: PersistedState): ShoppingEntry[] {
  return state.gear?.shoppingList ?? []
}

/** Add an entry. A newer plan for the same character and slot replaces the older one. */
export function addEntry(state: PersistedState, entry: ShoppingEntry): PersistedState {
  const kept = shoppingList(state).filter(
    (e) => !(e.characterName === entry.characterName && e.slotLabel === entry.slotLabel),
  )
  return { ...state, gear: { ...state.gear, shoppingList: [...kept, entry] } }
}

export function toggleEntry(state: PersistedState, id: string): PersistedState {
  return {
    ...state,
    gear: { ...state.gear, shoppingList: shoppingList(state).map((e) => (e.id === id ? { ...e, done: !e.done } : e)) },
  }
}

export function removeEntry(state: PersistedState, id: string): PersistedState {
  return { ...state, gear: { ...state.gear, shoppingList: shoppingList(state).filter((e) => e.id !== id) } }
}
