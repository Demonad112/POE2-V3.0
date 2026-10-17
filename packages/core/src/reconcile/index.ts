/**
 * Reconciliation harness.
 *
 * CORRECTNESS RULE: poe.ninja's computed stats are authoritative, but we do NOT
 * silently prefer either source. When our local Tier 3 formulas, or PoB's own
 * exported `PlayerStat` values, disagree with poe.ninja, that disagreement is
 * FLAGGED and surfaced. Silently picking a winner is how a wrong number ships
 * looking confident.
 *
 * A drift report is a feature, not a test failure: it tells the user which
 * numbers to distrust.
 */

import type { CharModel } from '../model/types.js'
import { analyzeDefense } from '../defense/index.js'
import { analyzeDps } from '../dps/index.js'
import { indexBreakdowns, verifyTotal } from '../model/breakdowns.js'

/**
 * `unmapped` is a stat whose id has no known name. It is shown with its values
 * but never judged: there is no way to know how poe.ninja derives it, so a
 * disagreement is not evidence of anything.
 */
export type DriftSeverity = 'match' | 'minor' | 'major'

export interface DriftCheck {
  stat: string
  /** What poe.ninja says. */
  ninja: number | null
  /** What the other source says. */
  other: number | null
  otherSource: 'pob-export' | 'local-formula' | 'breakdown-arithmetic'
  /** |other - ninja| / |ninja|, or null when either side is missing. */
  relativeDelta: number | null
  severity: DriftSeverity | 'unresolved' | 'unmapped'
  note: string
}

/** Below this the two sources are treated as agreeing (rounding differences). */
const MINOR_THRESHOLD = 0.005
/** Above this the disagreement is worth surfacing prominently. */
const MAJOR_THRESHOLD = 0.05
/** Absolute difference treated as integer rounding however small the values are. */
const ROUNDING_UNITS = 1

function classify(ninja: number | null, other: number | null): { severity: DriftCheck['severity']; relativeDelta: number | null } {
  if (ninja === null || other === null) return { severity: 'unresolved', relativeDelta: null }
  if (ninja === 0 && other === 0) return { severity: 'match', relativeDelta: 0 }
  const denom = Math.abs(ninja) || Math.abs(other)
  const diff = Math.abs(other - ninja)
  const rel = diff / denom
  if (rel <= MINOR_THRESHOLD) return { severity: 'match', relativeDelta: rel }
  // Both sides round to whole numbers, so one unit apart is rounding, not a
  // disagreement: 52 against 53 is 1.9% but never "major".
  if (rel <= MAJOR_THRESHOLD || diff <= ROUNDING_UNITS) return { severity: 'minor', relativeDelta: rel }
  return { severity: 'major', relativeDelta: rel }
}

function check(
  stat: string,
  ninja: number | null,
  other: number | null,
  otherSource: DriftCheck['otherSource'],
  note = '',
): DriftCheck {
  const { severity, relativeDelta } = classify(ninja, other)
  return {
    stat,
    ninja,
    other,
    otherSource,
    relativeDelta,
    severity,
    note:
      note ||
      (severity === 'unresolved'
        ? 'One side did not report this stat; no comparison possible.'
        : severity === 'match'
          ? 'Sources agree.'
          : 'Sources disagree — treat this number with caution.'),
  }
}

export interface ReconciliationReport {
  checks: DriftCheck[]
  matches: number
  minor: number
  major: number
  unresolved: number
  /** Checks on stat ids with no known name. Reported, never counted as agreement or disagreement. */
  unmapped: number
  /** True when nothing disagreed materially. */
  clean: boolean
}

/**
 * Compare poe.ninja's numbers against PoB's exported PlayerStat values and
 * against our own arithmetic over `breakdowns`.
 *
 * `pobStats` comes from `readPlayerStats(decodePobExport(...))`. Pass an empty
 * object when no export is available — the checks then report `unresolved`
 * rather than fabricating a comparison.
 */
export interface ReconcileOptions {
  /**
   * The skill the export marks as main, which is the skill PoB's `TotalDPS`
   * belongs to. Null when the export does not say. When this option is given,
   * the DPS check pairs PoB's figure with poe.ninja's figure for THAT skill; when
   * it is omitted (older callers), the check pairs it with poe.ninja's highest
   * hit-DPS skill as before.
   */
  pobMainSkill?: string | null
}

export function reconcile(
  model: CharModel,
  pobStats: Record<string, number> = {},
  options: ReconcileOptions = {},
): ReconciliationReport {
  const defense = analyzeDefense(model)
  const dps = analyzeDps(model)
  const breakdowns = indexBreakdowns(model)
  const checks: DriftCheck[] = []

  const pob = (key: string): number | null =>
    typeof pobStats[key] === 'number' && Number.isFinite(pobStats[key]) ? pobStats[key] : null

  // --- poe.ninja vs Path of Building's own engine -------------------------
  // PoB's TotalDPS belongs to the skill the export had selected, so that is the
  // skill poe.ninja's figure must be taken from. Pairing it with another skill
  // would report a disagreement that is only two different skills.
  if ('pobMainSkill' in options) {
    const wanted = options.pobMainSkill
    if (!wanted) {
      if (dps.primary) {
        checks.push({
          ...check(`dps:${dps.primary.name}`, dps.primary.dps, null, 'pob-export'),
          note: 'The export does not say which skill it computed TotalDPS for, so no skill was compared.',
        })
      }
    } else {
      const norm = (s: string) => s.trim().toLowerCase()
      const skill = dps.skills.find((s) => norm(s.name) === norm(wanted) && s.dps > 0)
      checks.push(
        skill
          ? check(
              `dps:${skill.name}`,
              skill.dps,
              pob('TotalDPS'),
              'pob-export',
              `poe.ninja’s DPS for ${skill.name} vs the TotalDPS PoB computed for it (the skill the export marks as main).`,
            )
          : {
              ...check(`dps:${wanted}`, null, pob('TotalDPS'), 'pob-export'),
              note: `The export marks ${wanted} as main, but poe.ninja reports no hit damage for a skill of that name, so nothing was compared.`,
            },
      )
    }
  } else if (dps.primary) {
    checks.push(
      check(
        `dps:${dps.primary.name}`,
        dps.primary.dps,
        pob('TotalDPS'),
        'pob-export',
        'poe.ninja per-skill DPS vs the TotalDPS PoB computed for the same build.',
      ),
    )
  }
  checks.push(check('life', defense.life, pob('Life'), 'pob-export'))
  checks.push(check('energyShield', defense.energyShield, pob('EnergyShield'), 'pob-export'))
  checks.push(check('armour', defense.armour, pob('Armour'), 'pob-export'))
  checks.push(check('evasion', defense.evasion, pob('Evasion'), 'pob-export'))
  checks.push(check('evadeChance', defense.evadeChance, pob('EvadeChance'), 'pob-export'))

  for (const [statKey, pobKey] of [
    ['physicalMaximumHit', 'PhysicalMaximumHitTaken'],
    ['fireMaximumHit', 'FireMaximumHitTaken'],
    ['coldMaximumHit', 'ColdMaximumHitTaken'],
    ['lightningMaximumHit', 'LightningMaximumHitTaken'],
    ['chaosMaximumHit', 'ChaosMaximumHitTaken'],
  ] as const) {
    const type = statKey.replace('MaximumHit', '')
    const ninjaValue = defense.maxHits.find((m) => m.type === type)?.value ?? null
    checks.push(check(statKey, ninjaValue, pob(pobKey), 'pob-export'))
  }

  // --- poe.ninja's own totals vs its own breakdown parts ------------------
  // A mismatch here means our reading of the breakdown wire format has
  // drifted, which is worth knowing loudly. `verifyTotal` accounts for capped
  // resistances and for stats poe.ninja derives without listing modifiers, so
  // an unverifiable stat reports `unresolved` rather than a false alarm.
  for (const stat of breakdowns.all) {
    if (stat.derivation === 'empty') continue
    const verification = verifyTotal(stat)
    if (stat.confidence === null) {
      checks.push({
        stat: `breakdown:${stat.key}`,
        ninja: stat.total,
        other: verification.expected,
        otherSource: 'breakdown-arithmetic',
        relativeDelta: null,
        severity: 'unmapped',
        note: `poe.ninja stat id ${stat.key.replace(/^stat_/, '')} has no known name, so how it is derived is unknown. Shown, not judged.`,
      })
      continue
    }
    checks.push(
      check(
        `breakdown:${stat.key}`,
        stat.total,
        verification.expected,
        'breakdown-arithmetic',
        verification.uncheckableReason ??
          (stat.derivation === 'capped'
            ? `poe.ninja’s stated total vs base x (1 + inc/100) x more, clamped to the ${stat.cap} cap.`
            : 'poe.ninja’s stated total vs base x (1 + inc/100) x more recomputed from its own parts.'),
      ),
    )
  }

  const matches = checks.filter((c) => c.severity === 'match').length
  const minor = checks.filter((c) => c.severity === 'minor').length
  const major = checks.filter((c) => c.severity === 'major').length
  const unresolved = checks.filter((c) => c.severity === 'unresolved').length
  const unmapped = checks.filter((c) => c.severity === 'unmapped').length

  return { checks, matches, minor, major, unresolved, unmapped, clean: major === 0 && minor === 0 }
}
