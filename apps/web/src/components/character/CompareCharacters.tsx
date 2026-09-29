'use client'

/**
 * This character beside another one you have imported, figure by figure.
 *
 * Reads only snapshots already saved in this browser — nothing is fetched —
 * so the other side is as of its last import, and says so.
 */

import { useState } from 'react'
import { compareSnapshots, historyFor, type CharacterSnapshot } from '@poe2/core'
import { usePersistedState } from '@/hooks/usePersistedState'
import { recentCharacters } from '@/lib/recentCharacters'
import { useLocalStore } from '@/lib/localStore'
import { Panel, fmt } from '../ui'

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const latest = (all: CharacterSnapshot[], key: string) => historyFor(all, key).at(-1) ?? null
const PERCENT = new Set(['fire', 'cold', 'lightning', 'chaos'])

export function CompareCharacters({ currentKey, currentName, bare = false }: { currentKey: string; currentName: string; bare?: boolean }) {
  const { state } = usePersistedState()
  const recents = useLocalStore(recentCharacters)
  const snapshots = state.character.snapshots
  const others = recents.filter((r) => r.key !== currentKey && latest(snapshots, r.key))
  const [picked, setPicked] = useState<string | null>(null)
  const other = others.find((r) => r.key === picked) ?? others[0] ?? null

  const mine = latest(snapshots, currentKey)
  const theirs = other ? latest(snapshots, other.key) : null

  return (
    <Panel
      title="Compare"
      subtitle="This character beside another you have imported, as of each one's last import. Saved in this browser; nothing is fetched."
      bare={bare}
    >
      {!mine || !other || !theirs ? (
        <p className="max-w-prose text-xs leading-relaxed text-ink-mute">
          {others.length === 0
            ? 'Import another character from poe.ninja, or open a link someone shared, and it can be compared here.'
            : 'This character has no saved snapshot yet — it is recorded once the passive tree has loaded.'}
        </p>
      ) : (
        <>
          {others.length > 1 ? (
            <label className="mb-3 flex items-center gap-2 text-xs text-ink-dim">
              Compare with
              <select
                value={other.key}
                onChange={(e) => setPicked(e.target.value)}
                className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
              >
                {others.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                    {r.level !== null ? ` (${r.level})` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <table className="tabular w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] text-ink-mute">
                <th scope="col" className="py-1 font-normal" />
                <th scope="col" className="py-1 text-right font-medium text-ink-dim">
                  {currentName}
                  <span className="block font-normal text-ink-mute">{when(mine.at)}</span>
                </th>
                <th scope="col" className="py-1 text-right font-medium text-ink-dim">
                  {other.name}
                  <span className="block font-normal text-ink-mute">{when(theirs.at)}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {compareSnapshots(mine, theirs).map((row) => {
                const unit = PERCENT.has(row.metric) ? '%' : ''
                const cell = (v: number | null, side: 'a' | 'b') => (
                  <td className={`py-1 text-right ${row.ahead === side ? 'font-semibold text-ink' : 'text-ink-dim'}`}>
                    {v === null ? '—' : `${fmt(v)}${unit}`}
                  </td>
                )
                return (
                  <tr key={row.metric} className="border-t border-line">
                    <th scope="row" className="py-1 text-left font-normal text-ink-mute">
                      {row.label}
                    </th>
                    {cell(row.a, 'a')}
                    {cell(row.b, 'b')}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-ink-mute">
            Higher is better on every row; the stronger figure is in bold. &ldquo;—&rdquo; means poe.ninja did not report it.
          </p>
        </>
      )}
    </Panel>
  )
}
