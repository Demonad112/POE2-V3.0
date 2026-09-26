'use client'

import { useState } from 'react'
import { NinjaClient, NinjaError, looksLikePobCode, parseProfileUrl } from '@poe2/core'
import { PROXY_BASE } from '@/lib/proxy'
import { useLocalStore } from '@/lib/localStore'
import { recentCharacters } from '@/lib/recentCharacters'

const EXAMPLE = 'https://poe.ninja/poe2/profile/Demonad112-2589/runesofaldur/character/Athrynas'

export type ImportResult =
  /** `url` is set when it came from a poe.ninja profile URL, so it can be re-imported. */
  | { ok: true; kind: 'ninja'; data: unknown; url?: string }
  /** A Path of Building export code. Fewer stats, all of them real. */
  | { ok: true; kind: 'pob'; code: string }
  | { ok: false; error: string; canPaste: boolean }

/** Why `target` can't be imported, or null when it looks like a full profile URL. */
export function checkProfileUrl(target: string): string | null {
  const ref = parseProfileUrl(target)
  if (!ref) return 'That does not look like a poe.ninja PoE2 character URL. Expected something like the example below.'
  if (!ref.leagueSlug) return 'That URL has no league in it. Use the full profile URL, which includes the league.'
  return null
}

/**
 * Fetch a character by its poe.ninja profile URL. Shared by the import bar and
 * the character page's `?import=` handling, which must live on the page: the
 * bar is mounted in two places that swap as an analysis appears, and a bar
 * that read the parameter itself re-imported on every swap.
 */
export async function importProfile(target: string): Promise<ImportResult> {
  const ref = parseProfileUrl(target)
  if (!ref?.leagueSlug) return { ok: false, error: checkProfileUrl(target) ?? 'Invalid URL.', canPaste: false }
  try {
    const client = new NinjaClient({ fetch: (i, init) => fetch(i, init), proxyBaseUrl: PROXY_BASE })
    const data = await client.fetchCharacter(ref.account, ref.leagueSlug, ref.character)
    // Put the profile in the address bar, so a reload or a shared link
    // re-imports the same character instead of landing on an empty page.
    try {
      const next = new URL(window.location.href)
      next.searchParams.set('import', target)
      window.history.replaceState(window.history.state, '', next)
    } catch {
      // Cosmetic only.
    }
    return { ok: true, kind: 'ninja', data, url: target }
  } catch (err) {
    const message =
      err instanceof NinjaError ? err.message : `Import failed: ${(err as Error).message ?? 'unknown error'}`
    return { ok: false, error: message, canPaste: true }
  }
}

export function ImportBar({
  onResult,
  busy,
  setBusy,
}: {
  onResult: (r: ImportResult) => void
  busy: boolean
  setBusy: (b: boolean) => void
}) {
  const [mode, setMode] = useState<'url' | 'paste'>('url')
  const [url, setUrl] = useState('')
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recents = useLocalStore(recentCharacters)

  async function importUrl(e: React.FormEvent) {
    e.preventDefault()
    await runImport(url)
  }

  async function runImport(target: string) {
    setError(null)
    setMode('url')
    setUrl(target)
    const invalid = checkProfileUrl(target)
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy(true)
    try {
      const result = await importProfile(target)
      if (!result.ok) setError(result.error)
      onResult(result)
    } finally {
      setBusy(false)
    }
  }

  function importPaste(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const text = paste.trim()
    if (!text) {
      setError('Paste a character model JSON or a Path of Building export code.')
      return
    }
    // A Path of Building code is a second real source, not a lesser one: it
    // carries 106 computed PlayerStat values including every maximum-hit-taken
    // figure. This used to be rejected on the false claim that it carried none.
    if (looksLikePobCode(text)) {
      onResult({ ok: true, kind: 'pob', code: text })
      return
    }

    try {
      onResult({ ok: true, kind: 'ninja', data: JSON.parse(text) })
    } catch {
      setError(
        'That is neither valid JSON nor a Path of Building export code. Paste either the full response from ' +
          'poe.ninja’s character model endpoint, or a Path of Building code copied with its Share button.',
      )
    }
  }

  return (
    <div className="card rounded-xl p-4 sm:p-5">
      <div
        className="mb-3 flex gap-1 text-xs"
        role="tablist"
        aria-label="Import method"
      >
        {(['url', 'paste'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            type="button"
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              mode === m ? 'bg-surface-sunken text-ink' : 'text-ink-mute hover:text-ink-dim'
            }`}
          >
            {m === 'url' ? 'poe.ninja URL' : 'Paste data'}
          </button>
        ))}
      </div>

      {mode === 'url' ? (
        <form onSubmit={importUrl} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://poe.ninja/poe2/profile/Account-1234/league/character/Name"
            aria-label="poe.ninja character URL"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-mute"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-[#0b0b0d] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Analysing…' : 'Analyse'}
          </button>
        </form>
      ) : (
        <form onSubmit={importPaste} className="flex flex-col gap-2">
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={4}
            placeholder='Paste a character model JSON, or a Path of Building export code'
            aria-label="Character model JSON or Path of Building code"
            className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-xs text-ink placeholder:text-ink-mute"
          />
          <button
            type="submit"
            disabled={busy}
            className="self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-[#0b0b0d] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Analyse pasted data
          </button>
        </form>
      )}

      {mode === 'url' && recents.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-ink-mute">Recent:</span>
          {recents.map((r) => (
            <button
              key={r.url}
              type="button"
              disabled={busy}
              onClick={() => void runImport(r.url)}
              title={r.url}
              className="rounded-full border border-line px-2 py-0.5 text-ink-dim transition-colors hover:border-accent-line hover:text-ink disabled:opacity-50"
            >
              {r.name}
              {r.level ? <span className="text-ink-mute"> · {r.level}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-xs leading-relaxed text-danger">
          {error}
        </p>
      ) : null}

      <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
        {mode === 'url' ? (
          <>
            Example:{' '}
            <button
              type="button"
              onClick={() => setUrl(EXAMPLE)}
              className="text-accent underline underline-offset-2 transition-opacity hover:opacity-80"
            >
              {EXAMPLE}
            </button>
            {' '}
            — fetched through a small proxy, because poe.ninja blocks direct browser requests. If it is unavailable,
            paste the data instead.
          </>
        ) : (
          'Works entirely in your browser with no server. Everything below is computed locally from what you paste.'
        )}
      </p>
    </div>
  )
}
