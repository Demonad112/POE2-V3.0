/**
 * The one-line cost of an upgrade, built only from deltas the caller measured.
 * Gains are not listed; a line exists to say what is given up.
 */

export interface TradeoffDelta {
  label: string
  /** Signed change. Negative means something is given up. */
  value: number
  /** '%' for percent changes, '' for flat amounts. */
  unit: '%' | ''
}

function fmt(n: number): string {
  return String(Number(n.toFixed(1)))
}

/** E.g. "-0.6% survivability, -33 mana". Null when nothing is given up. */
export function buildTradeoffLine(deltas: TradeoffDelta[]): string | null {
  const costs = deltas.filter((d) => Number.isFinite(d.value) && d.value < 0)
  if (!costs.length) return null
  return costs.map((d) => `${fmt(d.value)}${d.unit} ${d.label}`).join(', ')
}
