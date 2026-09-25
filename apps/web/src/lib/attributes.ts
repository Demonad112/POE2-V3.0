/**
 * The character's attribute totals, when the Path of Building export supplies
 * them (`Str`/`Dex`/`Int`). Undefined without the export — a requirement check
 * against a number we don't have would be a guess.
 */
export function attributesFrom(
  pobStats: Record<string, number> | null,
): Partial<Record<'str' | 'dex' | 'int', number>> | undefined {
  if (!pobStats) return undefined
  const out: Partial<Record<'str' | 'dex' | 'int', number>> = {}
  if (typeof pobStats.Str === 'number') out.str = pobStats.Str
  if (typeof pobStats.Dex === 'number') out.dex = pobStats.Dex
  if (typeof pobStats.Int === 'number') out.int = pobStats.Int
  return Object.keys(out).length ? out : undefined
}
