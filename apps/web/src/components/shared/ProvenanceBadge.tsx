import { labelOf, valueLabelInfo, type Provenance, type ValueLabel } from '@poe2/core'

const TONE: Record<ValueLabel, string> = {
  observed: 'border-line text-ink-mute',
  'pob-simulated': 'border-accent/40 bg-accent/10 text-accent',
  derived: 'border-warn/40 bg-warn/10 text-warn',
  nominal: 'border-warn/40 bg-warn/10 text-warn',
  unknown: 'border-line-strong bg-surface-overlay/60 text-ink-dim',
}

/**
 * Says where a number came from: observed, PoB-simulated, derived, nominal or
 * unknown. Pass `provenance` for a figure that carries one, or `label` directly.
 */
export function ProvenanceBadge({ provenance, label }: { provenance?: Provenance | null; label?: ValueLabel }) {
  const info = label ? valueLabelInfo(label) : labelOf(provenance)
  return (
    <span
      title={info.detail}
      className={`inline-flex cursor-help items-center rounded border px-1.5 py-px text-[10px] leading-tight ${TONE[info.label]}`}
    >
      {info.text}
    </span>
  )
}
