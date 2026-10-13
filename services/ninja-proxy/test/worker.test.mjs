// The Workers entry wraps Vercel-style handlers in a req/res shim. These tests
// pin the shim's behaviour: query mapping, CORS, status codes and body passthrough.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handle } from '../worker/index.js'

const call = (path, init) => handle(new Request(`https://proxy.test${path}`, init))

test('health answers 200 and is not cached', async () => {
  const r = await call('/api/health')
  assert.equal(r.status, 200)
  assert.equal(r.headers.get('cache-control'), 'no-store')
  assert.equal(r.headers.get('access-control-allow-origin'), '*')
  const body = await r.json()
  assert.equal(body.ok, true)
  assert.deepEqual(body.endpoints, ['/api/character', '/api/ladder', '/api/health'])
})

test('trailing slash still routes', async () => {
  assert.equal((await call('/api/health/')).status, 200)
})

test('OPTIONS preflight returns 204 with no body and CORS headers', async () => {
  const r = await call('/api/character', { method: 'OPTIONS' })
  assert.equal(r.status, 204)
  assert.equal(await r.text(), '')
  assert.equal(r.headers.get('access-control-allow-origin'), '*')
})

test('character requires account, league and character', async () => {
  const r = await call('/api/character?account=A-1&league=x')
  assert.equal(r.status, 400)
  assert.match((await r.json()).error, /required/)
})

test('character rejects non-GET methods', async () => {
  const r = await call('/api/character?account=A-1&league=x&character=c', { method: 'POST' })
  assert.equal(r.status, 405)
})

test('ladder requires a league', async () => {
  const r = await call('/api/ladder')
  assert.equal(r.status, 400)
})

test('ladder maps query params through and passes handler JSON and status back', async () => {
  const realFetch = globalThis.fetch
  const seen = []
  globalThis.fetch = async (url) => {
    seen.push(String(url))
    return new Response(JSON.stringify({ snapshotVersions: [] }), { status: 200 })
  }
  try {
    const r = await call('/api/ladder?league=nope&class=Witch')
    assert.equal(r.status, 404)
    assert.match((await r.json()).error, /no ladder snapshot for league "nope"/)
    assert.deepEqual(seen, ['https://poe.ninja/poe2/api/data/index-state'])
  } finally {
    globalThis.fetch = realFetch
  }
})

test('unknown paths return a CORS-enabled 404', async () => {
  const r = await call('/nope')
  assert.equal(r.status, 404)
  assert.equal(r.headers.get('access-control-allow-origin'), '*')
})
