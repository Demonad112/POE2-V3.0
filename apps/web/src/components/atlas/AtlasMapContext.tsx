'use client'

/**
 * Lets any row on the Atlas page ask the map to show a node: "Show on tree"
 * buttons call `focus(names)`, the map frames and pulses them.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export interface FocusRequest {
  names: string[]
  /** Label shown on the map while focused ("Man Trap"). */
  label: string
  /** Changes on every request, so asking for the same node twice re-frames it. */
  nonce: number
}

interface AtlasMapContextValue {
  request: FocusRequest | null
  focus: (names: string[], label?: string) => void
  clear: () => void
}

const Ctx = createContext<AtlasMapContextValue | null>(null)

export function AtlasMapProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<FocusRequest | null>(null)
  const focus = useCallback((names: string[], label?: string) => {
    setRequest({ names, label: label ?? names.join(', '), nonce: Date.now() })
    document.getElementById('atlas-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])
  const clear = useCallback(() => setRequest(null), [])
  const value = useMemo(() => ({ request, focus, clear }), [request, focus, clear])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAtlasMap(): AtlasMapContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAtlasMap must be used inside AtlasMapProvider')
  return ctx
}

/** The pin button every guide row carries when it names real tree nodes. */
export function ShowOnTreeButton({ names, label }: { names?: string[]; label: string }) {
  const { focus } = useAtlasMap()
  if (!names?.length) return null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        focus(names, label)
      }}
      title="Show on the Atlas tree"
      aria-label={`Show ${label} on the Atlas tree`}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-accent-line/60 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent transition-colors hover:bg-accent/20"
    >
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-3">
        <path
          d="M10 17.5s5.5-5 5.5-9.5a5.5 5.5 0 1 0-11 0c0 4.5 5.5 9.5 5.5 9.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="8" r="2" fill="currentColor" />
      </svg>
      Map
    </button>
  )
}
