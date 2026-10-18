import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  badQueryParam,
  clearBodyCache,
  MAX_QUERY_LENGTH,
  politeFetch,
  retryAfterMs,
  revalidatingFetch,
  UPSTREAM_USER_AGENT,
} from '../api/_upstream.js'

const res = (status, retryAfter) => ({
  status,
  headers: { get: (n) => (n === 'retry-after' ? retryAfter ?? null : null) },
})
const scripted = (...responses) => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return responses[Math.min(calls.length - 1, responses.length - 1)]
  }
  return { calls, fetchImpl }
}

test('names the service and a repo URL, not an email address', () => {
  assert.match(UPSTREAM_USER_AGENT, /^poe2-endgame-companion-proxy \(\+https:\/\//)
  assert.doesNotMatch(UPSTREAM_USER_AGENT, /@/)
})

test('sends the User-Agent and keeps the caller\'s headers', async () => {
  const { calls, fetchImpl } = scripted(res(200))
  await politeFetch('https://x', { headers: { accept: 'a' } }, { fetchImpl })
  assert.equal(calls[0].init.headers['user-agent'], UPSTREAM_USER_AGENT)
  assert.equal(calls[0].init.headers.accept, 'a')
})

test('retries a 429, honouring Retry-After', async () => {
  const { calls, fetchImpl } = scripted(res(429, '1'), res(200))
  const waits = []
  const out = await politeFetch('https://x', {}, { fetchImpl, sleepImpl: async (ms) => waits.push(ms) })
  assert.equal(out.status, 200)
  assert.equal(calls.length, 2)
  assert.deepEqual(waits, [1000])
})

test('backs off exponentially without Retry-After, then gives up after two retries', async () => {
  const { calls, fetchImpl } = scripted(res(503))
  const waits = []
  const out = await politeFetch('https://x', {}, { fetchImpl, sleepImpl: async (ms) => waits.push(ms) })
  assert.equal(out.status, 503)
  assert.equal(calls.length, 3)
  assert.deepEqual(waits, [300, 600])
})

test('returns the throttled response when Retry-After is longer than it will wait', async () => {
  const { calls, fetchImpl } = scripted(res(429, '60'))
  const out = await politeFetch('https://x', {}, { fetchImpl, sleepImpl: async () => assert.fail('should not wait') })
  assert.equal(out.status, 429)
  assert.equal(calls.length, 1)
})

test('does not retry a 404', async () => {
  const { calls, fetchImpl } = scripted(res(404))
  await politeFetch('https://x', {}, { fetchImpl })
  assert.equal(calls.length, 1)
})

test('retryAfterMs ignores HTTP-date and junk values', () => {
  assert.equal(retryAfterMs(res(429, 'Wed, 21 Oct 2026 07:28:00 GMT')), null)
  assert.equal(retryAfterMs(res(429, '3')), 3000)
})

test('badQueryParam flags repeated, non-string or over-long values and ignores absent ones', () => {
  const long = 'x'.repeat(MAX_QUERY_LENGTH + 1)
  assert.equal(badQueryParam({ league: 'Runes' }, ['league', 'class']), null)
  assert.equal(badQueryParam({ league: long }, ['league']), 'league')
  assert.equal(badQueryParam({ league: ['a', 'b'] }, ['league']), 'league')
  assert.equal(badQueryParam({ league: 'x'.repeat(MAX_QUERY_LENGTH) }, ['league']), null)
  assert.equal(badQueryParam({ class: 'Deadeye', league: long }, ['class', 'league']), 'league')
})

const body = (status, text, etag) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (n) => (n === 'etag' ? etag ?? null : null) },
  text: async () => text,
})

test('revalidatingFetch sends If-None-Match after an ETag and serves the cached body on 304', async () => {
  clearBodyCache()
  const { calls, fetchImpl } = scripted(body(200, '{"a":1}', '"v1"'), body(304))
  const first = await revalidatingFetch('https://m/1', {}, { fetchImpl })
  assert.equal(first.body, '{"a":1}')
  assert.equal(first.etag, '"v1"')
  assert.equal(first.revalidated, false)
  assert.equal(calls[0].init.headers?.['if-none-match'], undefined)

  const second = await revalidatingFetch('https://m/1', {}, { fetchImpl })
  assert.equal(calls[1].init.headers['if-none-match'], '"v1"')
  assert.equal(second.status, 200)
  assert.equal(second.body, '{"a":1}')
  assert.equal(second.revalidated, true)
})

test('revalidatingFetch replaces the cached body when upstream sends a new one', async () => {
  clearBodyCache()
  const { fetchImpl } = scripted(body(200, 'old', '"v1"'), body(200, 'new', '"v2"'), body(304))
  await revalidatingFetch('https://m/2', {}, { fetchImpl })
  const changed = await revalidatingFetch('https://m/2', {}, { fetchImpl })
  assert.equal(changed.body, 'new')
  const again = await revalidatingFetch('https://m/2', {}, { fetchImpl })
  assert.equal(again.body, 'new')
  assert.equal(again.etag, '"v2"')
})

test('revalidatingFetch caches nothing without an ETag and passes errors through', async () => {
  clearBodyCache()
  const { calls, fetchImpl } = scripted(body(200, 'x'), body(404))
  const ok = await revalidatingFetch('https://m/3', {}, { fetchImpl })
  assert.equal(ok.etag, null)
  const miss = await revalidatingFetch('https://m/3', {}, { fetchImpl })
  assert.equal(calls[1].init.headers?.['if-none-match'], undefined)
  assert.equal(miss.status, 404)
  assert.equal(miss.ok, false)
})
