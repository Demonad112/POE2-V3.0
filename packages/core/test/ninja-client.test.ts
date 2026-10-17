/**
 * The SSE hop is the fragile part of talking to poe.ninja, and it is not
 * exercised by the fixture tests. These cover it with a stream that behaves
 * like the real endpoint.
 */

import { describe, expect, it, vi } from 'vitest'
import { NinjaClient, NinjaError, type FetchLike, type ResponseLike } from '../src/ninja/client.js'
import { LEAGUE_SLUGS, leagueSlug, normalizeAccount, parseProfileUrl } from '../src/ninja/url.js'
import { leagueSlugOf } from '../src/ninja/ladder.js'

function jsonResponse(body: unknown): ResponseLike {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
    json: async () => body,
  }
}

/**
 * An SSE stream that emits the version frame and then keeps emitting keep-alive
 * frames FOREVER — exactly like poe.ninja. A client that awaits the whole body
 * hangs here, which is precisely the bug this guards.
 */
function neverEndingSse(version: number, opts: { splitAcrossChunks?: boolean } = {}): ResponseLike {
  const encoder = new TextEncoder()
  const frame = `data: {"version":${version}}\n`
  let emitted = false

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!emitted) {
        emitted = true
        if (opts.splitAcrossChunks) {
          controller.enqueue(encoder.encode(frame.slice(0, 12)))
          controller.enqueue(encoder.encode(frame.slice(12)))
        } else {
          controller.enqueue(encoder.encode(frame))
        }
        return
      }
      controller.enqueue(encoder.encode(':\n'))
    },
  })

  return {
    ok: true,
    status: 200,
    body,
    text: () => new Promise<string>(() => {}), // never resolves, like the real thing
    json: () => new Promise<unknown>(() => {}),
  }
}

describe('SSE version hop', () => {
  it('reads the version without waiting for a stream that never ends', async () => {
    const model = { type: 'found', charModel: { name: 'Athrynas' } }
    const fetchImpl = vi.fn<FetchLike>(async (url) =>
      url.includes('/events/') ? neverEndingSse(43) : jsonResponse(model),
    )

    const client = new NinjaClient({ fetch: fetchImpl })
    // Without incremental reading this call never settles.
    const result = await client.fetchCharacter('Demonad112-2589', 'runesofaldur', 'Athrynas')

    expect(result).toEqual(model)
    // The version must be threaded into the model URL, not guessed.
    expect(fetchImpl.mock.calls[1]![0]).toContain('/model/43')
  })

  it('handles a frame split across chunk boundaries', async () => {
    const fetchImpl = vi.fn<FetchLike>(async (url) =>
      url.includes('/events/') ? neverEndingSse(7, { splitAcrossChunks: true }) : jsonResponse({ charModel: {} }),
    )
    const client = new NinjaClient({ fetch: fetchImpl })
    await client.fetchCharacter('A-1', 'standard', 'B')
    expect(fetchImpl.mock.calls[1]![0]).toContain('/model/7')
  })

  it('reports a private or unindexed profile rather than defaulting a version', async () => {
    const encoder = new TextEncoder()
    const fetchImpl: FetchLike = async () => ({
      ok: true,
      status: 200,
      body: new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(encoder.encode('data: {}\n'))
          c.close()
        },
      }),
      text: async () => 'data: {}\n',
      json: async () => ({}),
    })
    const client = new NinjaClient({ fetch: fetchImpl })
    await expect(client.fetchCharacter('A-1', 'standard', 'B')).rejects.toMatchObject({ reason: 'not-found' })
  })

  it('surfaces a 404 as not-found', async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 404,
      text: async () => '',
      json: async () => ({}),
    })
    const client = new NinjaClient({ fetch: fetchImpl })
    await expect(client.fetchCharacter('A-1', 'standard', 'B')).rejects.toBeInstanceOf(NinjaError)
  })
})

describe('proxy mode', () => {
  it('skips the SSE hop entirely and calls the proxy once', async () => {
    const model = { type: 'found', charModel: {} }
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(model))
    const client = new NinjaClient({ fetch: fetchImpl, proxyBaseUrl: 'https://proxy.example/' })

    await client.fetchCharacter('Demonad112#2589', 'runesofaldur', 'Athrynas')

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const url = fetchImpl.mock.calls[0]![0]
    expect(url).toBe(
      'https://proxy.example/api/character?account=Demonad112-2589&league=runesofaldur&character=Athrynas',
    )
  })
})

describe('URL parsing', () => {
  it('handles every poe.ninja profile URL shape', () => {
    expect(parseProfileUrl('https://poe.ninja/poe2/profile/Demonad112-2589/runesofaldur/character/Athrynas')).toEqual({
      account: 'Demonad112-2589',
      leagueSlug: 'runesofaldur',
      character: 'Athrynas',
    })
    expect(parseProfileUrl('https://poe.ninja/poe2/profile/Demonad112-2589/character/Athrynas')).toMatchObject({
      account: 'Demonad112-2589',
      character: 'Athrynas',
      leagueSlug: null,
    })
    expect(parseProfileUrl('https://poe.ninja/poe2/builds/runesofaldur/character/Acc-1/Char')).toMatchObject({
      account: 'Acc-1',
      leagueSlug: 'runesofaldur',
      character: 'Char',
    })
    expect(parseProfileUrl('https://poe.ninja/poe2/builds/character/Acc-1/Char')).toMatchObject({
      account: 'Acc-1',
      character: 'Char',
    })
  })

  it('returns null rather than a half-guessed reference', () => {
    expect(parseProfileUrl('https://example.com/whatever')).toBeNull()
    expect(parseProfileUrl('')).toBeNull()
    expect(parseProfileUrl('not a url')).toBeNull()
  })

  it('maps league display names to the slugs the API wants', () => {
    expect(leagueSlug('Runes of Aldur')).toBe('runesofaldur')
    expect(leagueSlug('Fate of the Vaal')).toBe('vaal')
    expect(LEAGUE_SLUGS['hc runes of aldur']).toBe('runesofaldurhc')
  })

  // Slugs as poe.ninja's index-state served them on 2026-09-24: hc and ssf are
  // suffixes on the base slug, whatever order the display name puts them in.
  it.each([
    ['Forbidden Rites', 'forbiddenrites'],
    ['HC Forbidden Rites', 'forbiddenriteshc'],
    ['SSF Forbidden Rites', 'forbiddenritesssf'],
    ['HC SSF Forbidden Rites', 'forbiddenriteshcssf'],
    ['Hardcore Forbidden Rites', 'forbiddenriteshc'],
    ['HC Runes of Aldur', 'runesofaldurhc'],
    ['SSF Runes of Aldur', 'runesofaldurssf'],
    ['HC Fate of the Vaal', 'vaalhc'],
    ['forbiddenriteshc', 'forbiddenriteshc'],
    ['Standard', 'standard'],
    ['Hardcore', 'hardcore'],
  ])('slugs %s as %s through both slug functions', (name, slug) => {
    expect(leagueSlug(name)).toBe(slug)
    expect(leagueSlugOf(name)).toBe(slug)
  })

  it('converts the display account form to the API path form', () => {
    expect(normalizeAccount('Demonad112#2589')).toBe('Demonad112-2589')
    expect(normalizeAccount(' Demonad112-2589 ')).toBe('Demonad112-2589')
  })
})

describe('NinjaClient politeness', () => {
  const profile = (status: number, retryAfter?: string): ResponseLike => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => '{}',
    json: async () => ({}),
    headers: { get: (n) => (n.toLowerCase() === 'retry-after' ? (retryAfter ?? null) : null) },
  })

  it('sends the configured User-Agent on direct calls only', async () => {
    const direct = vi.fn<Parameters<FetchLike>, ReturnType<FetchLike>>(async () => profile(200))
    await new NinjaClient({ fetch: direct, userAgent: 'tool (+https://example.test)' }).listCharacters('a#1').catch(() => {})
    expect(direct.mock.calls[0]![1]?.headers).toEqual({ 'user-agent': 'tool (+https://example.test)' })

    const proxied = vi.fn<Parameters<FetchLike>, ReturnType<FetchLike>>(async () => profile(200))
    await new NinjaClient({ fetch: proxied, proxyBaseUrl: 'https://p.test', userAgent: 'tool' })
      .fetchCharacter('a#1', 'l', 'c')
      .catch(() => {})
    expect(proxied.mock.calls[0]![1]?.headers).toBeUndefined()
  })

  it('retries a 429 after Retry-After and then succeeds', async () => {
    const fetchMock = vi
      .fn<Parameters<FetchLike>, ReturnType<FetchLike>>()
      .mockResolvedValueOnce(profile(429, '0.001'))
      .mockResolvedValueOnce(profile(200))
    const res = await new NinjaClient({ fetch: fetchMock, proxyBaseUrl: 'https://p.test', retryDelayMs: 1 }).fetchCharacter(
      'a#1',
      'l',
      'c',
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(res).toEqual({})
  })

  it('gives up after the configured retries and reports the status', async () => {
    const fetchMock = vi.fn<Parameters<FetchLike>, ReturnType<FetchLike>>(async () => profile(503))
    await expect(
      new NinjaClient({ fetch: fetchMock, proxyBaseUrl: 'https://p.test', retries: 1, retryDelayMs: 1 }).fetchCharacter('a#1', 'l', 'c'),
    ).rejects.toMatchObject({ reason: 'bad-response' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
