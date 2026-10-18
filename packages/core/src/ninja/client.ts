/**
 * poe.ninja PoE2 API client.
 *
 * The core stays pure: `fetch` is INJECTED, never imported. That is what lets
 * the MCP server call poe.ninja directly (server-side, no CORS) while the web
 * app routes the same code through a proxy, with both sharing this logic.
 *
 * ## Why a proxy is needed in the browser
 * Measured 2026-07-24: poe.ninja sends NO `Access-Control-Allow-Origin` header
 * on any /poe2/api endpoint, and `OPTIONS` returns 405. A browser cannot call
 * it directly at all. Public CORS proxies additionally choke on the SSE first
 * hop because they buffer the stream.
 *
 * ## The two-step fetch
 * Every character read is: SSE endpoint -> `data: {"version":N}` -> then the
 * model endpoint at that version. The version is not guessable.
 */

import type { CharModelResponse } from '../model/types.js'
import { normalizeAccount } from './url.js'

export interface ResponseLike {
  ok: boolean
  status: number
  text(): Promise<string>
  json(): Promise<unknown>
  /** Present on real fetch. Required to read an SSE stream without hanging. */
  body?: ReadableStream<Uint8Array> | null
  /** Present on real fetch. Read for `Retry-After` on a throttled response. */
  headers?: { get(name: string): string | null }
}

export type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<ResponseLike>

const MAX_CACHED_MODELS = 8

export type NinjaErrorReason = 'not-found' | 'network' | 'cors' | 'bad-response' | 'timeout'

export class NinjaError extends Error {
  override name = 'NinjaError'
  constructor(
    readonly reason: NinjaErrorReason,
    message: string,
  ) {
    super(message)
  }
}

export interface NinjaClientOptions {
  fetch: FetchLike
  /**
   * Base for direct poe.ninja calls. Server-side only — a browser cannot use
   * this (no CORS).
   */
  baseUrl?: string
  /**
   * Proxy base for browser use. When set, character reads go to
   * `{proxyBaseUrl}/api/character?account=&league=&character=` and the SSE hop
   * happens server-side inside the proxy.
   */
  proxyBaseUrl?: string
  timeoutMs?: number
  /**
   * Sent as `User-Agent` on direct calls so poe.ninja can see who is asking and
   * how to reach them. Server-side only: a browser cannot set it, and a custom
   * header would force a CORS preflight, so it is ignored when `proxyBaseUrl`
   * is set. The deployer chooses the contact; the library names none.
   */
  userAgent?: string
  /** Extra attempts after a 429 or 503. Default 2. */
  retries?: number
  /** First backoff in ms, doubled each attempt; a `Retry-After` header overrides it. Default 500. */
  retryDelayMs?: number
}

const DEFAULT_BASE = 'https://poe.ninja'
const DEFAULT_TIMEOUT = 20_000
const DEFAULT_RETRIES = 2
const DEFAULT_RETRY_DELAY = 500
/** Longest a `Retry-After` is honoured for; past this the caller sees the 429. */
const MAX_RETRY_WAIT = 5_000

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** A JSON body that is not an object is a drifted payload, not a model to read values from. */
function expectObject(json: unknown, what: string): Record<string, unknown> {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new NinjaError('bad-response', `poe.ninja returned an unexpected shape for ${what}.`)
  }
  return json as Record<string, unknown>
}

/** Extract the payload of the first `data:` line, or null if the stream ends. */
function firstDataLine(buffer: string): string | null {
  const line = buffer.split('\n').find((l) => l.startsWith('data:'))
  return line ? line.slice(5).trim() : null
}

/**
 * Read a never-closing SSE stream just far enough to get its first data frame,
 * then cancel it. Cancelling matters: leaving the reader open holds the socket
 * for the life of the process.
 */
async function readFirstDataFrame(body: ReadableStream<Uint8Array>): Promise<string | null> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return firstDataLine(buffer)
      buffer += decoder.decode(value, { stream: true })
      const frame = firstDataLine(buffer)
      // Only accept a frame once it is complete — it may be split across chunks.
      if (frame !== null && buffer.includes('\n')) return frame
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
}

/** Fallback for fetch implementations that expose no body stream (test doubles). */
async function readFirstDataFrameFromText(res: ResponseLike): Promise<string | null> {
  return firstDataLine(await res.text())
}

export class NinjaClient {
  private readonly fetch: FetchLike
  private readonly baseUrl: string
  private readonly proxyBaseUrl: string | null
  private readonly timeoutMs: number
  private readonly userAgent: string | null
  private readonly retries: number
  private readonly retryDelayMs: number
  /**
   * Last model and ETag per versioned model URL, direct mode only: a browser
   * sending `If-None-Match` itself would need a CORS preflight the proxy does
   * not answer, and the browser's own HTTP cache already revalidates the
   * proxy's `ETag`. Whether poe.ninja sends an ETag here is unverified.
   */
  private readonly models = new Map<string, { etag: string; model: CharModelResponse }>()

  constructor(opts: NinjaClientOptions) {
    this.fetch = opts.fetch
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, '')
    this.proxyBaseUrl = opts.proxyBaseUrl ? opts.proxyBaseUrl.replace(/\/+$/, '') : null
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT
    this.userAgent = opts.userAgent && !this.proxyBaseUrl ? opts.userAgent : null
    this.retries = Math.max(0, opts.retries ?? DEFAULT_RETRIES)
    this.retryDelayMs = Math.max(0, opts.retryDelayMs ?? DEFAULT_RETRY_DELAY)
  }

  private async get(url: string, etag?: string): Promise<ResponseLike> {
    for (let attempt = 0; ; attempt++) {
      const res = await this.getOnce(url, etag)
      if ((res.status !== 429 && res.status !== 503) || attempt >= this.retries) return res
      const header = Number(res.headers?.get('retry-after'))
      const wait = Number.isFinite(header) && header > 0 ? header * 1000 : this.retryDelayMs * 2 ** attempt
      // A server asking for longer than we will wait is answered with its own 429.
      if (wait > MAX_RETRY_WAIT) return res
      await sleep(wait)
    }
  }

  private async getOnce(url: string, etag?: string): Promise<ResponseLike> {
    const signal = typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(this.timeoutMs) : undefined
    const init: { signal?: AbortSignal; headers?: Record<string, string> } = {}
    if (signal) init.signal = signal
    const headers: Record<string, string> = {}
    if (this.userAgent) headers['user-agent'] = this.userAgent
    if (etag) headers['if-none-match'] = etag
    if (Object.keys(headers).length > 0) init.headers = headers
    try {
      return await this.fetch(url, init)
    } catch (err) {
      const name = (err as { name?: string })?.name
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new NinjaError('timeout', `Request to ${url} timed out after ${this.timeoutMs}ms.`)
      }
      // A fetch that never yields a Response gives no status to inspect. The
      // cause differs by mode and fetch cannot tell CORS from a dead host, so
      // the reason is 'network' in both. The message names both possibilities.
      throw new NinjaError(
        'network',
        this.proxyBaseUrl
          ? 'Could not reach the import service. It may be down or unreachable from your network — pasting the character data works without it.'
          : `Could not reach ${url}. In a browser this is poe.ninja's CORS policy, which requires a proxy; on a server it is a network failure.`,
      )
    }
  }

  /**
   * Read the `version` number from an SSE endpoint.
   *
   * CRITICAL: this stream never closes on its own — poe.ninja holds it open and
   * emits keep-alive frames indefinitely. Awaiting the whole body (`res.text()`)
   * therefore hangs until the request times out. Read incrementally instead and
   * stop the moment the first `data:` frame arrives.
   */
  private async readVersion(url: string): Promise<number> {
    const res = await this.get(url)
    if (res.status === 404) throw new NinjaError('not-found', 'poe.ninja has no record of that account or character.')
    if (!res.ok) throw new NinjaError('bad-response', `poe.ninja returned ${res.status} for the version stream.`)

    const frame = res.body ? await readFirstDataFrame(res.body) : await readFirstDataFrameFromText(res)
    if (frame === null) throw new NinjaError('bad-response', 'The version stream carried no data frame.')

    let parsed: { version?: unknown }
    try {
      parsed = JSON.parse(frame) as { version?: unknown }
    } catch {
      throw new NinjaError('bad-response', 'The version frame was not valid JSON.')
    }
    if (typeof parsed.version !== 'number') {
      throw new NinjaError('not-found', 'poe.ninja returned no version — the profile may be private or unindexed.')
    }
    return parsed.version
  }

  /** List an account's characters. Server-side only (no proxy route for this). */
  async listCharacters(account: string): Promise<unknown[]> {
    const acct = encodeURIComponent(normalizeAccount(account))
    const version = await this.readVersion(`${this.baseUrl}/poe2/api/events/characters/${acct}`)
    const res = await this.get(`${this.baseUrl}/poe2/api/profile/characters/${acct}/${version}`)
    if (!res.ok) throw new NinjaError('bad-response', `poe.ninja returned ${res.status} for the character list.`)
    const json: unknown = await res.json()
    // An empty list here would look like "no characters" when the payload has drifted.
    if (!Array.isArray(json)) throw new NinjaError('bad-response', 'poe.ninja returned an unexpected character list.')
    return json
  }

  /**
   * Fetch one character's full model.
   *
   * Uses the proxy when configured (browser), otherwise the direct two-step
   * fetch (server).
   */
  async fetchCharacter(account: string, league: string, character: string): Promise<CharModelResponse> {
    const acct = normalizeAccount(account)

    if (this.proxyBaseUrl) {
      const url =
        `${this.proxyBaseUrl}/api/character?account=${encodeURIComponent(acct)}` +
        `&league=${encodeURIComponent(league)}&character=${encodeURIComponent(character)}`
      const res = await this.get(url)
      if (res.status === 404) {
        let detail = 'Character not found — check the profile is public and the name is correct.'
        try {
          const body = (await res.json()) as { error?: unknown }
          if (typeof body?.error === 'string') detail = body.error
        } catch {
          /* non-JSON body; keep the default */
        }
        throw new NinjaError('not-found', detail)
      }
      if (!res.ok) throw new NinjaError('bad-response', `The import service returned ${res.status}.`)
      return expectObject(await res.json(), 'the character model') as CharModelResponse
    }

    const e = (s: string) => encodeURIComponent(s)
    const version = await this.readVersion(
      `${this.baseUrl}/poe2/api/events/character/${e(acct)}/${e(league)}/${e(character)}`,
    )
    // The URL names the version, so a 304 for it can only mean "same model".
    const modelUrl = `${this.baseUrl}/poe2/api/profile/characters/${e(acct)}/${e(league)}/${e(character)}/model/${version}`
    const cached = this.models.get(modelUrl)
    const res = await this.get(modelUrl, cached?.etag)
    if (res.status === 304 && cached) return structuredClone(cached.model)
    if (!res.ok) throw new NinjaError('bad-response', `poe.ninja returned ${res.status} for the character model.`)
    const model = expectObject(await res.json(), 'the character model') as CharModelResponse
    const etag = res.headers?.get('etag')
    if (etag) {
      this.models.delete(modelUrl)
      this.models.set(modelUrl, { etag, model: structuredClone(model) })
      if (this.models.size > MAX_CACHED_MODELS) this.models.delete(this.models.keys().next().value as string)
    }
    return model
  }
}
