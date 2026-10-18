// Shared by the proxy's functions: every request to poe.ninja goes through
// `politeFetch`, which names this service and backs off when asked to.
//
// The leading underscore keeps Vercel from deploying this file as a route.

// A public repository URL, never a personal address. A fork sets
// UPSTREAM_CONTACT to its own.
export const UPSTREAM_USER_AGENT = `poe2-endgame-companion-proxy (+${
  process.env.UPSTREAM_CONTACT || 'https://github.com/Demonad112/poe2-v3.0'
})`

const RETRY_STATUSES = new Set([429, 502, 503, 504])
const MAX_RETRIES = 2
const BASE_DELAY_MS = 300
// A function that waits longer than this for upstream is near its own timeout.
const MAX_WAIT_MS = 2_000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Longest accepted value for any query parameter. Account, character and league names are all far shorter. */
export const MAX_QUERY_LENGTH = 64

/**
 * The first named query parameter that is repeated, not a string, or longer than
 * MAX_QUERY_LENGTH; null when all present ones are fine. Absent parameters are
 * the handler's own concern and are not checked here.
 */
export function badQueryParam(query, names) {
  for (const name of names) {
    const value = query?.[name]
    if (value === undefined) continue
    if (typeof value !== 'string' || value.length > MAX_QUERY_LENGTH) return name
  }
  return null
}

/** Seconds from a `Retry-After` header, or null when absent or not a number of seconds. */
export function retryAfterMs(res) {
  const n = Number(res.headers?.get('retry-after'))
  return Number.isFinite(n) && n > 0 ? n * 1000 : null
}

/**
 * `fetch` with a descriptive User-Agent and a short, bounded retry on 429 and
 * transient 5xx. `Retry-After` wins over the backoff, but is not honoured past
 * MAX_WAIT_MS: the caller then gets the throttled response as it is. A thrown
 * error (including an abort) is not retried.
 */
export async function politeFetch(url, init = {}, { fetchImpl = fetch, sleepImpl = sleep } = {}) {
  const headers = { 'user-agent': UPSTREAM_USER_AGENT, ...init.headers }
  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(url, { ...init, headers })
    if (!RETRY_STATUSES.has(res.status) || attempt >= MAX_RETRIES) return res
    const wait = retryAfterMs(res) ?? BASE_DELAY_MS * 2 ** attempt
    if (wait > MAX_WAIT_MS) return res
    await res.body?.cancel?.().catch(() => {})
    await sleepImpl(wait)
  }
}

const MAX_CACHED = 16

/**
 * Last good body and ETag per URL, for the life of this function instance.
 * Only used for URLs that name an immutable version (the model URL carries the
 * version number), so a 304 can never serve a stale body under a new version.
 * Serverless instances come and go: this is a best-effort saving, not a store.
 */
const bodies = new Map()

/** Drops everything cached; tests only. */
export function clearBodyCache() {
  bodies.clear()
}

/**
 * `politeFetch` plus `If-None-Match` revalidation. Returns `{ status, ok, body,
 * etag, revalidated }` for a 2xx or a 304 that the cache can answer, and the raw
 * response otherwise. Whether poe.ninja sends an ETag on this endpoint has not
 * been verified: without one nothing is cached and this behaves as `politeFetch`.
 */
export async function revalidatingFetch(url, init = {}, { fetchImpl, sleepImpl } = {}) {
  const hit = bodies.get(url)
  const headers = hit ? { ...init.headers, 'if-none-match': hit.etag } : init.headers
  const res = await politeFetch(url, { ...init, headers }, { fetchImpl, sleepImpl })
  if (res.status === 304 && hit) {
    return { status: 200, ok: true, body: hit.body, etag: hit.etag, revalidated: true }
  }
  if (!res.ok) return res
  const body = await res.text()
  const etag = res.headers?.get('etag') ?? null
  if (etag) {
    bodies.delete(url)
    bodies.set(url, { etag, body })
    if (bodies.size > MAX_CACHED) bodies.delete(bodies.keys().next().value)
  }
  return { status: res.status, ok: true, body, etag, revalidated: false }
}
