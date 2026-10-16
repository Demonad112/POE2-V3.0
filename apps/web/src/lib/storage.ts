import { migrateSnapshots } from "@poe2/core";
import type { PersistedState } from "./types";

export const STORAGE_KEY = "poe2-endgame-companion:v1";
export const STORAGE_VERSION = 1;

const DEFAULT_STATE: PersistedState = {
  version: STORAGE_VERSION,
  checklist: { completedStepIds: [], completedActionItemKeys: [] },
  atlas: { allocatedClusterIds: [], allocatedForkIds: [] },
  dashboard: { lastQuizAnswers: {}, pinnedStrategyId: undefined },
  character: { snapshots: [] },
  updatedAt: new Date(0).toISOString(),
};

export function defaultState(): PersistedState {
  return DEFAULT_STATE;
}

// Module-level cache + subscriber list backing useSyncExternalStore, so the
// localStorage read only ever happens once per client session (lazily, on
// first getSnapshot() call) instead of inside a render/effect body.
let cache: PersistedState = DEFAULT_STATE;
let cacheInitialized = false;
const listeners = new Set<() => void>();

/**
 * Parse a stored payload. Pure, so it can be tested without a window.
 *
 * A payload from a different top-level version is still discarded. Character
 * snapshots are versioned on their own and migrated here, so a change to their
 * shape never costs the player their checklist or Atlas progress.
 */
export function parsePersisted(raw: string | null): PersistedState {
  if (!raw) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed || parsed.version !== STORAGE_VERSION) return DEFAULT_STATE;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      character: {
        ...parsed.character,
        snapshots: migrateSnapshots(parsed.character?.snapshots).snapshots,
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function readFromLocalStorage(): PersistedState {
  try {
    return parsePersisted(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_STATE;
  }
}

function writeToLocalStorage(state: PersistedState): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, updatedAt: new Date().toISOString() })
    );
  } catch {
    // localStorage can throw in private-browsing contexts — best-effort only.
  }
}

export function getSnapshot(): PersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  if (!cacheInitialized) {
    cache = readFromLocalStorage();
    cacheInitialized = true;
  }
  return cache;
}

export function getServerSnapshot(): PersistedState {
  return DEFAULT_STATE;
}

export function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function setPersistedState(
  updater: (prev: PersistedState) => PersistedState
): void {
  const prev = getSnapshot();
  const next = updater(prev);
  // An updater that returns exactly what it was given has decided nothing
  // changed, and serialising the whole state to localStorage and waking every
  // subscriber for that is pure cost. One character import runs the analysis
  // several times as the affix data, tree and ladder arrive, and each pass
  // re-recorded a history that had not moved.
  if (next === prev) return;
  cache = next;
  cacheInitialized = true;
  writeToLocalStorage(next);
  listeners.forEach((listener) => listener());
}
