"use client";

import { useCallback, useMemo } from "react";
import { usePersistedState } from "./usePersistedState";
import { useChecklistActions } from "./useChecklistActions";
import { roadmapSteps } from "@/data/roadmap";

export { actionItemKey } from "./useChecklistActions";

export function useChecklistState() {
  const { state, setState } = usePersistedState();
  const { completedStepIds, toggleStep, toggleActionItem, isActionItemComplete } =
    useChecklistActions();
  const {
    hideCompleted = false,
    highestTier = 0,
  } = state.checklist;

  const setHideCompleted = useCallback(
    (value: boolean) => {
      setState((prev) => ({
        ...prev,
        checklist: { ...prev.checklist, hideCompleted: value },
      }));
    },
    [setState]
  );

  const setHighestTier = useCallback(
    (tier: number) => {
      setState((prev) => ({
        ...prev,
        checklist: { ...prev.checklist, highestTier: tier },
      }));
    },
    [setState]
  );

  const isStepComplete = useCallback(
    (stepId: string) => completedStepIds.includes(stepId),
    [completedStepIds]
  );

  // Count only ids that still exist: a renamed or removed step must not keep
  // inflating the percentage from an old save.
  const completionPercent = useMemo(() => {
    if (roadmapSteps.length === 0) return 0;
    const done = roadmapSteps.filter((s) => completedStepIds.includes(s.id)).length;
    return Math.round((done / roadmapSteps.length) * 100);
  }, [completedStepIds]);

  return {
    toggleStep,
    toggleActionItem,
    isStepComplete,
    isActionItemComplete,
    completionPercent,
    completedStepIds,
    hideCompleted,
    setHideCompleted,
    highestTier,
    setHighestTier,
  };
}
