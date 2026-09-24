"use client";

import { useCallback, useMemo } from "react";
import { usePersistedState } from "./usePersistedState";
import { roadmapSteps } from "@/data/roadmap";

export function actionItemKey(stepId: string, index: number) {
  return `${stepId}::${index}`;
}

export function useChecklistState() {
  const { state, setState } = usePersistedState();
  const {
    completedStepIds,
    completedActionItemKeys,
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

  const isStepComplete = useCallback(
    (stepId: string) => completedStepIds.includes(stepId),
    [completedStepIds]
  );

  const isActionItemComplete = useCallback(
    (key: string) => completedActionItemKeys.includes(key),
    [completedActionItemKeys]
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
