"use client";

import { useCallback } from "react";
import type { ReplacementPlan } from "@poe2/core";
import { usePersistedState } from "./usePersistedState";
import { addEntry, entryFromDraft, entryFromPlan, removeEntry, shoppingList, toggleEntry, type SlotDraft } from "@/lib/shoppingList";

export function useShoppingList() {
  const { state, setState } = usePersistedState();

  const save = useCallback(
    (plan: ReplacementPlan, characterName: string) => {
      setState((prev) => addEntry(prev, entryFromPlan(plan, characterName)));
    },
    [setState]
  );
  const saveDraft = useCallback(
    (draft: SlotDraft, characterName: string) => {
      setState((prev) => addEntry(prev, entryFromDraft(draft, characterName)));
    },
    [setState]
  );
  const toggle = useCallback((id: string) => setState((prev) => toggleEntry(prev, id)), [setState]);
  const remove = useCallback((id: string) => setState((prev) => removeEntry(prev, id)), [setState]);

  return { entries: shoppingList(state), save, saveDraft, toggle, remove };
}
