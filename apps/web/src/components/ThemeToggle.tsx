'use client'

import { useEffect, useState } from 'react'

type Mode = 'dark' | 'light' | 'system'

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('system')

  useEffect(() => {
    const stored = localStorage.getItem('poe2-theme')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage, an external system, on mount
    if (stored === 'light' || stored === 'dark') setMode(stored)
  }, [])

  function apply(next: Mode) {
    setMode(next)
    if (next === 'system') {
      localStorage.removeItem('poe2-theme')
      document.documentElement.removeAttribute('data-theme')
    } else {
      localStorage.setItem('poe2-theme', next)
      document.documentElement.setAttribute('data-theme', next)
    }
  }

  const next: Mode = mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark'
  const label = mode === 'system' ? 'System theme' : mode === 'dark' ? 'Dark theme' : 'Light theme'

  return (
    <button
      type="button"
      onClick={() => apply(next)}
      title={`${label} — click for ${next}`}
      aria-label={`${label}. Switch to ${next}.`}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-2.5 text-xs text-ink-mute transition-colors hover:border-line-strong hover:text-ink-dim sm:py-1.5"
    >
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-3.5">
        {mode === 'light' ? (
          <>
            <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        ) : mode === 'dark' ? (
          <path d="M15.5 12.5A6 6 0 0 1 7.5 4.5a6 6 0 1 0 8 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        ) : (
          <>
            <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 3.5a6.5 6.5 0 0 1 0 13Z" fill="currentColor" />
          </>
        )}
      </svg>
      <span className="hidden sm:inline">{mode === 'system' ? 'Auto' : mode === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}
