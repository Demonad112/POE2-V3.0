'use client'

/**
 * Defences at a glance: resistances against cap, the one-shot ratio and
 * freeze, shock and ignite exposure. Restates figures already on the page;
 * a check the data cannot settle reads "Unknown", never a pass.
 */

import type { Analysis } from '@poe2/core'
import { STATUS_LABEL, defenceChecklist, type CheckStatus } from '@/lib/defenceChecklist'
import { Tag } from '../ui'

const TONE: Record<CheckStatus, 'good' | 'warn' | 'danger' | 'default'> = { pass: 'good', warn: 'warn', fail: 'danger', unknown: 'default' }

export function DefenceChecklist({ analysis }: { analysis: Analysis }) {
  const checks = defenceChecklist(analysis)
  return (
    <section className="card rounded-xl p-4" aria-label="Defences checklist" id="defence-checklist">
      <h3 className="text-xs font-medium tracking-wide text-ink-dim uppercase">Defences checklist</h3>
      <ul className="mt-2 space-y-1.5">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-xs" data-check={c.id} data-status={c.status}>
            <span className="mt-0.5 w-16 shrink-0">
              <Tag tone={TONE[c.status]}>{STATUS_LABEL[c.status]}</Tag>
            </span>
            <span className="min-w-0">
              <span className="font-medium text-ink">{c.label}</span>
              <span className="text-ink-dim"> · {c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
