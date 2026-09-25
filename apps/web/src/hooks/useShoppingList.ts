"use client";

import { useCallback } from "react";
import type { ReplacementPlan } from "@poe2/core";
import { usePersistedState } from "./usePersistedState";
import { addEntry, entryFromPlan, removeEntry, shoppingList, toggleEntry } from "@/lib/shoppingList";

export function useShoppingList() {
  const { state, setState } = usePersistedState();

  const save = useCallback(
    (plan: ReplacementPlan, characterName: string) => {
      setState((prev) => addEntry(prev, entryFromPlan(plan, characterName)));
    },
    [setState]
  );
  const toggle = useCallback((id: string) => setState((prev) => toggleEntry(prev, id)), [setState]);
  const remove = useCallback((id: string) => setState((prev) => removeEntry(prev, id)), [setState]);

  return { entries: shoppingList(state), save, toggle, remove };
}
