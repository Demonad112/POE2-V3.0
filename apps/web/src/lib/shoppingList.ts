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
