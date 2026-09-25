'use client'

/**
 * "Could the replacement be a different base?" — the bases of this slot side
 * by side with the current one, against the replacement spec. Differences are
 * stated per column; nothing is scored.
 */

import { useMemo, useState } from 'react'
import { alternativeBases, type ModTiers, type ReplacementPlan } from '@poe2/core'
import { useBaseCatalog } from '@/lib/useBaseCatalog'
import { Tag } from './ui'

const DEFENCE_LABEL: Record<string, string> = {
  Armour: 'Armour',
  Evasion: 'Evasion',
  EnergyShield: 'ES',
  Ward: 'Ward',
  BlockChance: 'Block %',
}

function defences(armour: Record<string, number> | null, weapon: Record<string, number> | null): string {
  if (armour) {
    const parts = Object.entries(armour)
      .filter(([k]) => DEFENCE_LABEL[k])
      .map(([k, v]) => `${v} ${DEFENCE_LABEL[k]}`)
    return parts.join(' · ') || '—'
  }
  if (weapon) {
    const parts: string[] = []
    if (weapon.PhysicalMax) parts.push(`${weapon.PhysicalMin}–${weapon.PhysicalMax} phys`)
    if (weapon.AttackRateBase) parts.push(`${weapon.AttackRateBase} aps`)
    if (weapon.CritChanceBase) parts.push(`${weapon.CritChanceBase}% crit`)
    return parts.join(' · ') || '—'
  }
  return '—'
}

function requirement(req: Record<string, number>): string {
  const parts = [req.level ? `lvl ${req.level}` : null, req.str ? `${req.str} Str` : null, req.dex ? `${req.dex} Dex` : null, req.int ? `${req.int} Int` : null]
  return parts.filter(Boolean).join(' · ') || '—'
}

export function AlternativeBases({
  plan,
  tiers,
  maxIlvl,
  attributes,
}: {
  plan: ReplacementPlan
  tiers: ModTiers
  maxIlvl?: number
  attributes?: Partial<Record<'str' | 'dex' | 'int', number>>
}) {
  const [open, setOpen] = useState(false)
  const state = useBaseCatalog(open)
  const result = useMemo(
    () =>
      state.status === 'ready'
        ? alternativeBases({
            plan,
            catalog: state.catalog,
            tiers,
            ...(maxIlvl !== undefined ? { maxIlvl } : {}),
            ...(attributes ? { attributes } : {}),
          })
        : null,
    [state, plan, tiers, maxIlvl, attributes],
  )

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-[11px] font-medium text-accent hover:underline"
      >
        {open ? 'Hide other bases' : `Other bases for this slot →`}
      </button>
      {open ? (
        <div className="mt-1.5 space-y-1.5">
          {state.status === 'loading' || state.status === 'idle' ? (
            <p className="text-[11px] text-ink-mute">Loading base data…</p>
          ) : state.status === 'error' ? (
            <p className="text-[11px] text-danger">Base data unavailable: {state.message}</p>
          ) : result ? (
            <>
              <p className="text-[10px] text-ink-mute">{result.orderedBy}</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-[11px]">
                  <thead className="text-ink-dim">
                    <tr className="border-b border-line">
                      <th className="py-1 pr-2 font-medium">Base</th>
                      <th className="py-1 pr-2 font-medium">Defences / stats</th>
                      <th className="py-1 pr-2 font-medium">Implicit</th>
                      <th className="py-1 pr-2 font-medium">Needs</th>
                      <th className="py-1 font-medium">Replacement lines</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.options.map((o) => (
                      <tr key={o.name} className={`border-b border-line/60 align-top ${o.current ? 'bg-accent/5' : ''}`}>
                        <td className="py-1 pr-2 text-ink">
                          {o.name}
                          {o.current ? <span className="ml-1 text-ink-mute">(yours)</span> : null}
                          {o.subType ? <div className="text-[10px] text-ink-mute">{o.subType}</div> : null}
                        </td>
                        <td className="tabular py-1 pr-2 text-ink-dim">{defences(o.armour, o.weapon)}</td>
                        <td className="py-1 pr-2 text-ink-dim">
                          {o.implicit.length ? o.implicit.join('; ') : '—'}
                          {o.implicitCovers.map((c) => (
                            <div key={c.type} className="text-good">
                              covers {c.min}%+ of the {c.type} you need
                            </div>
                          ))}
                        </td>
                        <td className="py-1 pr-2 text-ink-dim">
                          {requirement(o.req)}
                          {o.unmetAttributes.map((u) => (
                            <div key={u.attribute} className="text-danger">
                              {u.need} {u.attribute} — you have {u.have}
                            </div>
                          ))}
                        </td>
                        <td className="py-1">
                          <Tag tone={o.lostLines.length ? 'warn' : 'good'}>
                            {o.specFits}/{o.specFits + o.lostLines.length} can roll
                          </Tag>
                          {o.lostLines.map((l) => (
                            <div key={l} className="text-ink-mute line-through decoration-ink-mute/50">
                              {l}
                            </div>
                          ))}
                          {o.weakerLines.map((w) => (
                            <div key={w.text} className="text-warn">
                              {w.text}: best tier here starts at {w.baseMin} (spec {w.specMin})
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.notes.map((n) => (
                <p key={n} className="text-[10px] text-ink-mute">
                  {n}
                </p>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
