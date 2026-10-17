'use client'

/**
 * Ailment immunities, the Path of Building main-skill note and the inactive
 * weapon set. All informational: nothing here changes a figure or a ranking.
 * An ailment with no proving mod is "unknown", never "not immune".
 */

import type { Analysis } from '@poe2/core'
import { characterNotes } from '@/lib/characterNotes'
import { Tag } from '../ui'

export function CharacterNotes({ analysis }: { analysis: Analysis }) {
  const { ailments, mainSkill, inactiveSet, primaryInInactiveSet } = characterNotes(analysis)
  const immune = ailments.flatMap((a) => (a.status === 'immune' ? [a] : []))
  const unknown = ailments.filter((a) => a.status === 'unknown')
  const idleItems = inactiveSet.items

  return (
    <section className="card space-y-4 rounded-xl p-4" aria-label="Character notes">
      <div>
        <h3 className="text-xs font-medium tracking-wide text-ink-dim uppercase">Ailment immunities</h3>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {immune.map((a) => (
            <span key={a.ailment} title={a.sources.map((s) => `${s.slotLabel}: ${s.line}`).join(' · ')}>
              <Tag tone="good">{a.ailment}</Tag>
            </span>
          ))}
          {unknown.map((a) => (
            <span key={a.ailment} title={a.reason}>
              <Tag>{a.ailment}: unknown</Tag>
            </span>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-ink-mute">
          Only unconditional “cannot be …” lines on equipped gear and allocated passive or ascendancy nodes count. Unknown means
          no such line was found, not that you are vulnerable.
        </p>
      </div>

      {mainSkill ? (
        <div>
          <h3 className="text-xs font-medium tracking-wide text-ink-dim uppercase">Main skill</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-dim">{mainSkill.message}</p>
          <p className="mt-1 text-[11px] text-ink-mute">{mainSkill.basisNote}</p>
        </div>
      ) : null}

      <div>
        <h3 className="text-xs font-medium tracking-wide text-ink-dim uppercase">
          Inactive weapon set (set {inactiveSet.inactiveSet})
        </h3>
        {inactiveSet.activeSetAssumed ? (
          <p className="mt-1.5 text-[11px] text-warn">The payload does not say which set is live; set 1 is assumed.</p>
        ) : null}
        {primaryInInactiveSet ? <p className="mt-1.5 text-xs leading-relaxed text-warn">{primaryInInactiveSet}</p> : null}
        {idleItems.length ? (
          <ul className="mt-1.5 space-y-0.5 text-xs text-ink-dim">
            {idleItems.map((i) => (
              <li key={`${i.slotLabel}-${i.name}`}>
                {i.slotLabel}: {i.name}
                {i.grantedSkills.length ? ` (grants ${i.grantedSkills.join(', ')})` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-xs text-ink-dim">No items in the inactive set.</p>
        )}
        <p className="mt-1 text-[11px] text-ink-mute">
          {inactiveSet.skills.status === 'known'
            ? inactiveSet.skills.names.length
              ? `Skills in this set: ${inactiveSet.skills.names.join(', ')}.`
              : 'No skills are placed in this set.'
            : inactiveSet.skills.reason}{' '}
          Nothing here counts towards the live build.
        </p>
      </div>
    </section>
  )
}
