/**
 * Pure view-model for the character page's defences checklist. It only
 * restates figures the analysis already holds: resistances against their caps,
 * the one-shot ratio, and ailment immunities read from gear and tree text.
 * A check the data cannot settle is `unknown`, never a pass or a fail.
 */

import { ailmentImmunities, type Analysis } from '@poe2/core'

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'unknown'

export interface DefenceCheck {
  id: string
  label: string
  status: CheckStatus
  detail: string
}

/** EHP reading above this multiple of the lowest maximum hit counts as misleading. */
export const EHP_OVERSTATEMENT_WARN = 1.5
/** Ailments worth a line of their own; the rest are covered by the immunity summary. */
const KEY_AILMENTS = ['freeze', 'shock', 'ignite'] as const

type Input = Pick<Analysis, 'defense' | 'items'> & Partial<Pick<Analysis, 'ailments'>>

export function defenceChecklist(analysis: Input): DefenceCheck[] {
  const d = analysis.defense
  const checks: DefenceCheck[] = []

  for (const r of d.resistances) {
    const label = `${r.type[0]!.toUpperCase()}${r.type.slice(1)} resistance`
    if (r.value === null || r.underCap === null) {
      checks.push({ id: `res-${r.type}`, label, status: 'unknown', detail: 'Not in the payload.' })
    } else if (r.underCap > 0) {
      checks.push({ id: `res-${r.type}`, label, status: 'fail', detail: `${r.value}/${r.max}%, ${r.underCap} under cap.` })
    } else {
      const over = r.overCap && r.overCap > 0 ? `, ${r.overCap} over cap (reallocatable)` : ''
      checks.push({ id: `res-${r.type}`, label, status: 'pass', detail: `${r.value}/${r.max}%${over}.` })
    }
  }

  if (d.lowestMaximumHit === null) {
    checks.push({ id: 'max-hit', label: 'Largest hit you survive', status: 'unknown', detail: 'No maximum hit in the payload.' })
  } else {
    const ratio = d.ehpOverstatementRatio
    const risky = ratio !== null && ratio > EHP_OVERSTATEMENT_WARN
    checks.push({
      id: 'max-hit',
      label: 'Largest hit you survive',
      status: risky ? 'warn' : 'pass',
      detail: `${Math.round(d.lowestMaximumHit).toLocaleString('en-US')}${d.lowestMaximumHitType ? ` (${d.lowestMaximumHitType})` : ''}${
        risky ? `; the effective health pool overstates survivability by ${ratio!.toFixed(1)}x.` : '.'
      }`,
    })
  }

  const ailments = analysis.ailments ?? ailmentImmunities(analysis.items)
  for (const name of KEY_AILMENTS) {
    const a = ailments.find((x) => x.ailment === name)
    const label = `${name[0]!.toUpperCase()}${name.slice(1)} exposure`
    if (!a) {
      checks.push({ id: `ail-${name}`, label, status: 'unknown', detail: 'Ailment data was not part of this analysis.' })
    } else if (a.status === 'immune') {
      checks.push({ id: `ail-${name}`, label, status: 'pass', detail: `Immune: ${a.sources.map((s) => s.itemName).join(', ')}.` })
    } else {
      checks.push({ id: `ail-${name}`, label, status: 'unknown', detail: 'No gear or tree line proves immunity. Exposure is not measurable from the payload.' })
    }
  }

  return checks
}

export const STATUS_LABEL: Record<CheckStatus, string> = { pass: 'OK', warn: 'Check', fail: 'Fix', unknown: 'Unknown' }
