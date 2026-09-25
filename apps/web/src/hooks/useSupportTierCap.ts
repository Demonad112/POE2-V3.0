"use client";

import { useCallback } from "react";
import { usePersistedState } from "./usePersistedState";

/**
 * The saved "highest support tier I can cut". `undefined` means the player
 * hasn't chosen, so the damage review falls back to the tier they already
 * socket; `null` means they chose no limit.
 */
export function useSupportTierCap() {
  const { state, setState } = usePersistedState();
  const setCap = useCallback(
    (cap: number | null | undefined) => {
      setState((prev) => ({ ...prev, gems: { ...prev.gems, maxSupportTier: cap } }));
    },
    [setState]
  );
  return { cap: state.gems?.maxSupportTier, setCap };
}
