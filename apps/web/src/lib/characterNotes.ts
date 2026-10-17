/**
 * Pure view-model helpers for the character page's additive notes. Kept out of
 * the components so they can be tested without a DOM.
 */

import {
  ailmentImmunities,
  changedSinceLastReport,
  primarySkillInInactiveSet,
  snapshotKey,
  type AilmentStatus,
  type Analysis,
  type ChangedSinceLastReport,
  type CharacterSnapshot,
  type FocusMode,
  type InactiveSetReport,
  type MainSkillNote,
} from '@poe2/core'

/** The focus toggle's choices. `default` maps to no focus, i.e. the unchanged order. */
export type FocusChoice = 'default' | FocusMode

export const FOCUS_CHOICES: ReadonlyArray<{ value: FocusChoice; label: string }> = [
  { value: 'default', label: 'Default' },
  { value: 'mapping', label: 'Mapping' },
  { value: 'bossing', label: 'Bossing' },
]

export const focusOf = (choice: FocusChoice): FocusMode | null => (choice === 'default' ? null : choice)

export interface CharacterNotes {
  /** Per ailment: immune with sources, or unknown. Never "not immune". */
  ailments: AilmentStatus[]
  mainSkill: MainSkillNote | null
  inactiveSet: InactiveSetReport
  /** Set when the primary skill sits in the inactive weapon set; null otherwise (including unknown). */
  primaryInInactiveSet: string | null
}

export function characterNotes(analysis: Pick<Analysis, 'items' | 'dps' | 'inactiveSet'>): CharacterNotes {
  return {
    ailments: ailmentImmunities(analysis.items),
    mainSkill: analysis.dps.mainSkill ?? null,
    inactiveSet: analysis.inactiveSet,
    primaryInInactiveSet: primarySkillInInactiveSet(analysis.dps.primary?.name ?? null, analysis.inactiveSet),
  }
}

/** "Changed since last report" for one analysis, using each element's own resistance maximum. */
export function changedFor(analysis: Analysis, snapshots: CharacterSnapshot[]): ChangedSinceLastReport {
  const maxOf = (type: string) => analysis.defense.resistances.find((r) => r.type === type)?.max ?? 75
  return changedSinceLastReport(snapshots, snapshotKey(analysis.identity), {
    fire: maxOf('fire'),
    cold: maxOf('cold'),
    lightning: maxOf('lightning'),
  })
}
