/**
 * Content-hash cache key for an analysis.
 *
 * Two requests for the same character with nothing changed must produce the
 * same key, so the second can reuse the first. The key covers everything that
 * can change the result: the character content (which includes the embedded
 * Path of Building export and therefore its saved configuration), the PoB
 * version, the game-data version and the analysis engine version.
 *
 * Fields poe.ninja refreshes without the character changing (`lastSeenUtc`,
 * `lastCheckedUtc`, `updatedUtc`) are excluded; including them would make every
 * poll a miss.
 *
 * Pure apart from `crypto.subtle`, which both Node 22 and browsers provide.
 */

/** Bump when a change to the analyzer would alter results for the same input. */
export const ANALYSIS_ENGINE_VERSION = 1

const VOLATILE_KEYS: ReadonlySet<string> = new Set(['updatedUtc', 'lastSeenUtc', 'lastCheckedUtc'])

/** JSON with object keys sorted, `undefined` dropped, non-finite numbers as null. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) return 'null'
    return JSON.stringify(value) ?? 'null'
  }
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && typeof v !== 'function')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`
}

export interface AnalysisKeyInput {
  /** The unwrapped character model, or a `{charModel}` envelope's content. */
  model: Record<string, unknown>
  /** Path of Building version the simulated figures were produced with, if any. */
  pobVersion: string | null
  /** Version of the generated game data (e.g. "0.5.5"). */
  dataVersion: string
  engineVersion?: number
}

export async function analysisCacheKey(input: AnalysisKeyInput): Promise<string> {
  const model = Object.fromEntries(Object.entries(input.model).filter(([k]) => !VOLATILE_KEYS.has(k)))
  const text = canonicalJson({
    model,
    pobVersion: input.pobVersion,
    dataVersion: input.dataVersion,
    engine: input.engineVersion ?? ANALYSIS_ENGINE_VERSION,
  })
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
