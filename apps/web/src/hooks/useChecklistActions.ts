"use client";

import { useCallback } from "react";
import { usePersistedState } from "./usePersistedState";

export function actionItemKey(stepId: string, index: number) {
  return `${stepId}::${index}`;
}

/**
 * Ticking steps and sub-steps, without the roadmap data. The home page only
 * needs these, and importing the roadmap for them shipped the whole guide to
 * a page that shows one step of it.
 */
export function useChecklistActions() {
  const { state, setState } = usePersistedState();
  const { completedStepIds, completedActionItemKeys } = state.checklist;

  const toggleStep = useCallback(
    (stepId: string) => {
      setState((prev) => {
        const set = new Set(prev.checklist.completedStepIds);
        if (set.has(stepId)) set.delete(stepId);
        else set.add(stepId);
        return {
          ...prev,
          checklist: { ...prev.checklist, completedStepIds: Array.from(set) },
        };
      });
    },
    [setState]
  );

  const toggleActionItem = useCallback(
    (key: string) => {
      setState((prev) => {
        const set = new Set(prev.checklist.completedActionItemKeys);
        if (set.has(key)) set.delete(key);
        else set.add(key);
        return {
          ...prev,
          checklist: {
            ...prev.checklist,
            completedActionItemKeys: Array.from(set),
          },
        };
      });
    },
    [setState]
  );

  const isActionItemComplete = useCallback(
    (key: string) => completedActionItemKeys.includes(key),
    [completedActionItemKeys]
  );

  return { completedStepIds, toggleStep, toggleActionItem, isActionItemComplete };
}
