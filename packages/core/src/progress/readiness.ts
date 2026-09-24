/**
 * Grade a character snapshot against the endgame guide's gates.
 *
 * Deliberately snapshot-based: the checklist runs without a live import, so it
 * reads the last recorded snapshot rather than a full analysis. Every check
 * reports what the character has and what the gate wants, so the UI never has
 * to restate a threshold.
 */

import type { CharacterSnapshot } from './index.js'
import {
  CHAOS_CRITICAL,
  CHAOS_TARGET,
  ELEMENTAL_RES_CAP,
  LEVEL_PINNACLE_PUSH,
  LEVEL_THIRD_ASCENDANCY,
  POOL_PINNACLE,
} from '../thresholds.js'

export type ReadinessMilestone = 'mapping' | 'ascendancy' | 'pinnacle'

export interface ReadinessCheck {
  id: string
  milestone: ReadinessMilestone
  label: string
  have: number
  need: number
  unit: 'percent' | 'level' | 'raw'
  pass: boolean
}

export interface Readiness {
  checks: ReadinessCheck[]
  /** Milestones where every check passes. */
  ready: Record<ReadinessMilestone, boolean>
}

function check(
  id: string,
  milestone: ReadinessMilestone,
  label: string,
  have: number,
  need: number,
  unit: ReadinessCheck['unit'],
): ReadinessCheck {
  return { id, milestone, label, have, need, unit, pass: have >= need }
}

export function assessReadiness(s: CharacterSnapshot): Readiness {
  const checks: ReadinessCheck[] = [
    check('fire-res', 'mapping', 'Fire resistance capped', s.fire, ELEMENTAL_RES_CAP, 'percent'),
    check('cold-res', 'mapping', 'Cold resistance capped', s.cold, ELEMENTAL_RES_CAP, 'percent'),
    check('lightning-res', 'mapping', 'Lightning resistance capped', s.lightning, ELEMENTAL_RES_CAP, 'percent'),
    check('chaos-floor', 'mapping', 'Chaos resistance not negative', s.chaos, CHAOS_CRITICAL, 'percent'),
    check('level-70', 'ascendancy', 'Level for the 3rd Ascendancy', s.level, LEVEL_THIRD_ASCENDANCY, 'level'),
    check('level-85', 'pinnacle', 'Level for the pinnacle push', s.level, LEVEL_PINNACLE_PUSH, 'level'),
    check('pool-pinnacle', 'pinnacle', 'Life + ES pool for pinnacles', s.pool, POOL_PINNACLE, 'raw'),
    check('chaos-target', 'pinnacle', 'Chaos resistance at target', s.chaos, CHAOS_TARGET, 'percent'),
  ]
  const ready = { mapping: true, ascendancy: true, pinnacle: true }
  for (const c of checks) if (!c.pass) ready[c.milestone] = false
  // Pinnacles also need everything mapping needs.
  if (!ready.mapping) ready.pinnacle = false
  return { checks, ready }
}

/** The most recent snapshot across every character, or null when none exist. */
export function latestSnapshot(snapshots: readonly CharacterSnapshot[]): CharacterSnapshot | null {
  let best: CharacterSnapshot | null = null
  for (const s of snapshots) if (!best || s.at > best.at) best = s
  return best
}
