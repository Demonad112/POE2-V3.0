/**
 * Sensitivity of a result to the enemy and player conditions it was computed
 * under.
 *
 * One damage figure is only true for one set of conditions. This re-measures a
 * metric with each condition switched on, one at a time, restores the build,
 * and reports the range. Every figure here is PoB-simulated (`source:
 * 'pob-sim'`), never mixed with poe.ninja's.
 *
 * ## Injected probe
 *
 * The orchestration is pure; what applies a condition is a `SensitivityProbe`.
 * `bridgeProbe` drives a live Path of Building through RPCs
 * (`get_config_input` / `set_config_input`) that the current bridge does not
 * use elsewhere and that have NOT been verified against the real addon from
 * here. If the addon rejects them, the condition is reported as not
 * measurable and no number is produced.
 *
 * ## Failure rules (same as `rankNodesByMeasuredGain`)
 *
 * A condition that cannot be applied is skipped with its reason. A build that
 * cannot be restored stops the run: every later reading would be taken against
 * a configuration that is no longer the user's.
 */

import { checkBaseline, type BaselineExpectation, type BaselineGateResult } from './baseline-gate.js'
import type { PobBridge } from './bridge.js'

export interface SensitivityCondition {
  id: string
  label: string
  /** PoB configuration inputs to switch on together. */
  inputs: readonly string[]
}

/** Input names follow `pob/config.ts`; charge names are PoB's own and unverified here. */
export const DEFAULT_CONDITIONS: readonly SensitivityCondition[] = Object.freeze([
  { id: 'shocked', label: 'enemy is shocked', inputs: ['conditionEnemyShocked'] },
  { id: 'chilled', label: 'enemy is chilled', inputs: ['conditionEnemyChilled'] },
  { id: 'ignited', label: 'enemy is ignited', inputs: ['conditionEnemyIgnited'] },
  { id: 'stationary', label: 'you are standing still', inputs: ['conditionStationary'] },
  {
    id: 'charges',
    label: 'charges are up',
    inputs: ['useFrenzyCharges', 'usePowerCharges', 'useEnduranceCharges'],
  },
])

export interface SensitivityProbe {
  /** Switch the condition on, remembering what to put back. */
  apply(condition: SensitivityCondition): Promise<void>
  /** PoB's current numeric stats. */
  measure(): Promise<Record<string, number>>
  /** Undo everything `apply` did. */
  restore(): Promise<void>
}

export interface SensitivityReading {
  condition: string
  label: string
  value: number
}

export interface SensitivityReport {
  source: 'pob-sim'
  metric: string
  /** The metric under the configuration as it was. Null if it could not be read. */
  baseline: number | null
  readings: SensitivityReading[]
  skipped: { condition: string; reason: string }[]
  /**
   * Smallest and largest value seen across the baseline and every measured
   * condition. Null unless the baseline and at least one condition were
   * measured: one reading is a point, not a range.
   */
  range: { min: number; max: number } | null
  /** Why `range` is null, when it is. */
  unknownReason: string | null
  /** True when the run stopped early because the build could not be restored. */
  halted: boolean
  warnings: string[]
  /** Baseline vs poe.ninja check. Null when no expectations were given (unvalidated). */
  baselineGate: BaselineGateResult | null
}

const num = (stats: Record<string, number>, metric: string): number | null => {
  const v = stats[metric]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export async function measureSensitivity(
  probe: SensitivityProbe,
  options: { metric?: string; conditions?: readonly SensitivityCondition[]; expected?: readonly BaselineExpectation[] } = {},
): Promise<SensitivityReport> {
  const metric = options.metric ?? 'TotalDPS'
  const conditions = options.conditions ?? DEFAULT_CONDITIONS
  const report: SensitivityReport = {
    source: 'pob-sim',
    metric,
    baseline: null,
    readings: [],
    skipped: [],
    range: null,
    unknownReason: null,
    halted: false,
    warnings: [],
    baselineGate: null,
  }

  try {
    const stats = await probe.measure()
    report.baseline = num(stats, metric)
    if (options.expected) {
      report.baselineGate = checkBaseline(options.expected, stats)
      if (!report.baselineGate.ok) {
        report.unknownReason = report.baselineGate.reason
        report.halted = true
        return report
      }
    } else {
      report.warnings.push('The simulation baseline was not checked against poe.ninja, so these readings are unvalidated.')
    }
  } catch (err) {
    report.unknownReason = `Could not read the baseline: ${(err as Error).message}`
    return report
  }
  if (report.baseline === null) {
    report.unknownReason = `Path of Building reported no numeric "${metric}".`
    return report
  }

  for (const condition of conditions) {
    let value: number | null = null
    try {
      await probe.apply(condition)
      value = num(await probe.measure(), metric)
      if (value === null) report.skipped.push({ condition: condition.id, reason: `No numeric "${metric}" under this condition.` })
    } catch (err) {
      report.skipped.push({ condition: condition.id, reason: `Not measurable: ${(err as Error).message}` })
    }

    try {
      await probe.restore()
      const after = num(await probe.measure(), metric)
      if (after !== report.baseline) {
        report.warnings.push(
          `After "${condition.id}" the ${metric} read ${after} instead of ${report.baseline}, so the build was not restored. ` +
            'Stopped: later readings would not be taken against your configuration. Fix it in Path of Building before re-running.',
        )
        report.halted = true
        if (value !== null) report.skipped.push({ condition: condition.id, reason: 'Reading discarded: the build was not restored afterwards.' })
        break
      }
    } catch (err) {
      report.warnings.push(`Could not restore after "${condition.id}": ${(err as Error).message}. Stopped.`)
      report.halted = true
      break
    }

    if (value !== null) report.readings.push({ condition: condition.id, label: condition.label, value })
  }

  if (report.readings.length > 0) {
    const values = [report.baseline, ...report.readings.map((r) => r.value)]
    report.range = { min: Math.min(...values), max: Math.max(...values) }
  } else if (!report.unknownReason) {
    report.unknownReason = 'No condition could be measured, so there is a single reading and no range.'
  }
  return report
}

/**
 * A probe backed by a live Path of Building. UNVERIFIED against the real
 * addon: `get_config_input` / `set_config_input` are assumed names.
 */
export function bridgeProbe(bridge: PobBridge): SensitivityProbe {
  let previous: { name: string; value: unknown }[] = []
  return {
    async apply(condition) {
      previous = []
      for (const name of condition.inputs) {
        const current = await bridge.call<{ value?: unknown }>('get_config_input', { name })
        previous.push({ name, value: current?.value ?? null })
        await bridge.call('set_config_input', { name, value: true })
      }
      await bridge.recalculate()
    },
    async measure() {
      return (await bridge.getCalcs()) as Record<string, number>
    },
    async restore() {
      const toRestore = previous.slice().reverse()
      previous = []
      for (const { name, value } of toRestore) await bridge.call('set_config_input', { name, value })
      await bridge.recalculate()
    },
  }
}
