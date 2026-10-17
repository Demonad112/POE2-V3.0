/**
 * How a figure should be labelled for the reader.
 *
 * `Provenance` records where a number came from inside the codebase. The reader
 * needs one of five plain labels, and must never see one kind of number
 * dressed as another:
 *
 *  - `observed`       read as given from poe.ninja or from the Path of Building
 *                     export it embeds. Nothing recomputed here.
 *  - `pob-simulated`  produced by driving Path of Building (the injected
 *                     transport). Kept apart from observed values.
 *  - `derived`        arithmetic this project did on observed values. Says so.
 *  - `nominal`        a figure from game data that says what something grants in
 *                     isolation, not what it does on this build.
 *  - `unknown`        the data cannot establish it; shown as a range or a gap.
 */

import type { Provenance } from './types.js'

export type ValueLabel = 'observed' | 'pob-simulated' | 'derived' | 'nominal' | 'unknown'

export interface ValueLabelInfo {
  label: ValueLabel
  /** Short text for a badge. */
  text: string
  /** One sentence for a tooltip. */
  detail: string
}

const INFO: Record<ValueLabel, ValueLabelInfo> = {
  observed: { label: 'observed', text: 'observed', detail: 'Read as given from poe.ninja or the Path of Building export it attaches. Not recomputed here.' },
  'pob-simulated': { label: 'pob-simulated', text: 'PoB-simulated', detail: 'Measured by running Path of Building. Separate from observed values.' },
  derived: { label: 'derived', text: 'derived', detail: 'Arithmetic done here on observed values. Check it against the source before relying on it.' },
  nominal: { label: 'nominal', text: 'nominal', detail: 'What the game data says it grants in isolation. Not measured on this build.' },
  unknown: { label: 'unknown', text: 'unknown', detail: 'The data cannot establish this value.' },
}

export function valueLabelInfo(label: ValueLabel): ValueLabelInfo {
  return INFO[label]
}

/** Map an internal provenance to the reader-facing label. A missing provenance is unknown, never observed. */
export function labelOf(provenance: Provenance | null | undefined): ValueLabelInfo {
  switch (provenance) {
    case 'ninja':
    case 'pob-export':
      return INFO.observed
    case 'pob-sim':
      return INFO['pob-simulated']
    case 'estimate':
    case 'derived':
      return INFO.derived
    case 'nominal':
      return INFO.nominal
    default:
      return INFO.unknown
  }
}
