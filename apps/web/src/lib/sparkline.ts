/**
 * Geometry for a sparkline: pure, so it is tested without a browser.
 *
 * A null value is a gap, not a zero — an import where poe.ninja did not report
 * DPS must not draw the line diving to the floor. The line breaks around it.
 */

export interface Spark {
  /** One SVG path per unbroken run of values. */
  segments: string[]
  /** Where each value is drawn; null for a gap. Same length as the input. */
  points: ({ x: number; y: number } | null)[]
  min: number | null
  max: number | null
}

export function sparkline(values: (number | null)[], width: number, height: number, pad = 4): Spark {
  const known = values.filter((v): v is number => v !== null)
  if (!known.length) return { segments: [], points: values.map(() => null), min: null, max: null }
  const min = Math.min(...known)
  const max = Math.max(...known)
  const span = max - min
  const n = values.length
  const x = (i: number) => (n === 1 ? width / 2 : pad + (i * (width - 2 * pad)) / (n - 1))
  // A flat series sits mid-height rather than on the floor, where it would read as "low".
  const y = (v: number) => (span === 0 ? height / 2 : pad + ((max - v) * (height - 2 * pad)) / span)
  const round = (v: number) => Math.round(v * 10) / 10

  const points = values.map((v, i) => (v === null ? null : { x: round(x(i)), y: round(y(v)) }))
  const segments: string[] = []
  let run: string[] = []
  for (const p of points) {
    if (p) run.push(`${run.length ? 'L' : 'M'}${p.x} ${p.y}`)
    else if (run.length) {
      segments.push(run.join(' '))
      run = []
    }
  }
  if (run.length) segments.push(run.join(' '))
  return { segments, points, min, max }
}
