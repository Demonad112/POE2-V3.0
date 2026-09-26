'use client'

import { useSyncExternalStore } from 'react'

/**
 * A small localStorage-backed store under its own key, for state that is not
 * checklist/Atlas progress. Keeping it out of the main saved-progress blob
 * means that blob's shape — and the keys a web test pins — never has to change
 * for it, and a bad write here cannot take progress down with it.
 *
 * Reads are lazy and cached; every read and write is best-effort, because
 * storage can be missing or throw (private mode, blocked site data).
 */
export interface LocalStore<T> {
  get: () => T
  set: (update: (prev: T) => T) => void
  subscribe: (listener: () => void) => () => void
  server: () => T
}

export function createLocalStore<T>(key: string, fallback: T, accept: (v: unknown) => boolean): LocalStore<T> {
  let cache = fallback
  let loaded = false
  const listeners = new Set<() => void>()

  const get = () => {
    if (typeof window === 'undefined') return fallback
    if (!loaded) {
      loaded = true
      try {
        const raw = window.localStorage.getItem(key)
        const parsed: unknown = raw ? JSON.parse(raw) : null
        if (parsed !== null && accept(parsed)) cache = parsed as T
      } catch {
        // Unreadable or corrupt: start empty.
      }
    }
    return cache
  }

  return {
    get,
    set(update) {
      const prev = get()
      const next = update(prev)
      if (next === prev) return
      cache = next
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Best-effort only.
      }
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    server: () => fallback,
  }
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.server)
}
