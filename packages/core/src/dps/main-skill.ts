/**
 * Shows the skill the PoB export marks as main beside the analyzer's primary.
 *
 * Informational only: `DpsSummary.primary` (highest hit DPS) is never changed
 * and nothing is re-ranked. A difference is flagged, not corrected.
 */

import type { DpsSummary } from './index.js'

export interface MainSkillNote {
  /** The skill name the export marks as main. */
  exportMain: string
  /** The analyzer's own primary skill, null when none hits. */
  primary: string | null
  /** True when both name the same skill. Null when the primary is unknown. */
  agrees: boolean | null
  /** poe.ninja's total DPS for the export's main skill, null when it has no damage block. */
  exportMainTotalDps: number | null
  message: string
  /** How the export's skill was matched to the analyzer's skills; by name only. */
  basisNote: string
}

export const MAIN_SKILL_BASIS_NOTE =
  'Matched by skill name only: the export and the payload share no skill id, so two skills with the same name cannot be told apart.'

export function mainSkillNote(dps: Pick<DpsSummary, 'skills' | 'primary'>, exportMain: string | null): MainSkillNote | null {
  if (!exportMain) return null
  const norm = (s: string) => s.trim().toLowerCase()
  const entry = dps.skills.find((s) => norm(s.name) === norm(exportMain))
  const primary = dps.primary?.name ?? null
  const agrees = primary === null ? null : norm(primary) === norm(exportMain)
  const message =
    agrees === null
      ? `The Path of Building export marks ${exportMain} as the main skill; no skill with hit damage was found to compare it with.`
      : agrees
        ? `The Path of Building export also marks ${exportMain} as the main skill.`
        : `The Path of Building export marks ${exportMain} as the main skill, but the highest-damage skill is ${primary}. The analysis is unchanged and still uses ${primary}.`
  return { exportMain, primary, agrees, exportMainTotalDps: entry?.totalDps ?? null, message, basisNote: MAIN_SKILL_BASIS_NOTE }
}
