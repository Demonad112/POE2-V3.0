/**
 * poe.ninja profile URL parsing.
 *
 * Adapted from the working implementation in Demonad112/Poe2-endgame
 * (src/lib/characterImport/parseProfileUrl.ts), which already handles the URL
 * shapes poe.ninja actually emits.
 *
 * League SLUGS are what the API wants, not display names.
 */

export interface ProfileRef {
  account: string
  /** League slug, e.g. `runesofaldur`. Null when the URL omitted it. */
  leagueSlug: string | null
  character: string
}

/**
 * League base name -> API slug, for the bases whose slug is not simply the name
 * with its spaces removed ("Fate of the Vaal" is `vaal`) plus the ones named
 * outright so the table documents what is live. Verified against
 * /poe2/api/data/index-state.
 *
 * Hardcore and SSF variants are NOT listed: poe.ninja appends `hc` then `ssf`
 * to the base slug ("HC SSF Forbidden Rites" is `forbiddenriteshcssf`), the
 * reverse of the display name's word order, and `leagueSlug` derives that. A
 * new league with an unabbreviated slug therefore needs no entry here at all.
 */
export const BASE_SLUGS: Readonly<Record<string, string>> = Object.freeze({
  'forbidden rites': 'forbiddenrites',
  'runes of aldur': 'runesofaldur',
  'fate of the vaal': 'vaal',
  abyss: 'abyss',
  dawn: 'dawn',
  standard: 'standard',
  hardcore: 'hardcore',
})

/** Leading display-name tokens poe.ninja turns into slug suffixes. */
const HC_PREFIX = /^(?:hc|hardcore)(?:\s+|$)/
const SSF_PREFIX = /^(?:ssf|solo self-found)(?:\s+|$)/

/**
 * Every display name this module resolves, with its slug. Derived from
 * `BASE_SLUGS`, so the two cannot disagree.
 */
export const LEAGUE_SLUGS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(BASE_SLUGS).flatMap(([name, slug]) =>
      name === 'standard' || name === 'hardcore'
        ? [[name, slug]]
        : [
            [name, slug],
            [`hc ${name}`, `${slug}hc`],
            [`ssf ${name}`, `${slug}ssf`],
            [`hc ssf ${name}`, `${slug}hcssf`],
          ],
    ),
  ),
)

/**
 * The API slug for a league display name, or the slug itself passed through.
 *
 * This is the only slug function in core: the ladder lookup delegates here, so
 * the profile URL and the ladder can never resolve one league two ways.
 */
export function leagueSlug(nameOrSlug: string): string {
  const key = nameOrSlug.trim().toLowerCase().replace(/\s+/g, ' ')
  const exact = BASE_SLUGS[key]
  if (exact) return exact

  let rest = key
  let hc = false
  let ssf = false
  for (;;) {
    if (!hc && HC_PREFIX.test(rest)) {
      hc = true
      rest = rest.replace(HC_PREFIX, '')
    } else if (!ssf && SSF_PREFIX.test(rest)) {
      ssf = true
      rest = rest.replace(SSF_PREFIX, '')
    } else break
  }

  const flat = (s: string) => s.replace(/[^a-z0-9]/g, '')
  // "Hardcore SSF" has no base league to suffix, so it is left as written.
  if ((!hc && !ssf) || !flat(rest)) return BASE_SLUGS[rest] ?? flat(key)
  return (BASE_SLUGS[rest] ?? flat(rest)) + (hc ? 'hc' : '') + (ssf ? 'ssf' : '')
}

const PATTERNS: Array<{ re: RegExp; order: Array<keyof ProfileRef> }> = [
  // /poe2/profile/{account}/{league}/character/{name}
  {
    re: /poe\.ninja\/poe2\/profile\/([^/?#\s]+)\/([^/?#\s]+)\/character\/([^/?#\s]+)/,
    order: ['account', 'leagueSlug', 'character'],
  },
  // /poe2/profile/{account}/character/{name}
  { re: /poe\.ninja\/poe2\/profile\/([^/?#\s]+)\/character\/([^/?#\s]+)/, order: ['account', 'character'] },
  // /poe2/builds/{league}/character/{account}/{name}
  {
    re: /poe\.ninja\/poe2\/builds\/([^/?#\s]+)\/character\/([^/?#\s]+)\/([^/?#\s]+)/,
    order: ['leagueSlug', 'account', 'character'],
  },
  // /poe2/builds/character/{account}/{name}
  { re: /poe\.ninja\/poe2\/builds\/character\/([^/?#\s]+)\/([^/?#\s]+)/, order: ['account', 'character'] },
]

/**
 * Parse any recognised poe.ninja profile URL. Returns null rather than a
 * partially-guessed reference when nothing matches.
 */
export function parseProfileUrl(input: string): ProfileRef | null {
  if (typeof input !== 'string' || !input.trim()) return null
  const text = input.trim()

  for (const { re, order } of PATTERNS) {
    const m = re.exec(text)
    if (!m) continue
    const ref: ProfileRef = { account: '', leagueSlug: null, character: '' }
    order.forEach((key, i) => {
      const raw = m[i + 1]
      if (raw === undefined) return
      const value = safeDecode(raw)
      if (key === 'leagueSlug') ref.leagueSlug = leagueSlug(value)
      else ref[key] = value
    })
    if (ref.account && ref.character) return ref
  }
  return null
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/**
 * poe.ninja renders accounts as `Name#1234` but the API path wants
 * `Name-1234`.
 */
export function normalizeAccount(account: string): string {
  return account.trim().replace('#', '-')
}
