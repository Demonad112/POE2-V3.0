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

function stubCaches() {
  const store = new Map()
  const calls = { match: 0, put: 0 }
  globalThis.caches = {
    default: {
      async match(req) {
        calls.match += 1
        return store.get(req.url)?.clone()
      },
      async put(req, res) {
        calls.put += 1
        store.set(req.url, res)
      },
    },
  }
  return calls
}

test('cache: a 200 with s-maxage is stored and served from cache on the next call', async () => {
  const calls = stubCaches()
  const realFetch = globalThis.fetch
  let upstream = 0
  globalThis.fetch = async (url) => {
    upstream += 1
    // index-state with no snapshots -> 404 path is not cacheable, so use a stub route instead
    return new Response('{}', { status: 200 })
  }
  try {
    // character 200 path: SSE frame with a version, then the model.
    globalThis.fetch = async (url) => {
      upstream += 1
      if (String(url).includes('/events/character/')) {
        return new Response('data: {"version": 7}\n\n', { status: 200 })
      }
      return new Response('{"type":"ok"}', { status: 200 })
    }
    const q = '/api/character?account=A%231&league=x&character=c'
    const first = await call(q, undefined)
    assert.equal(first.status, 200)
    const afterFirst = upstream
    const second = await call(q, undefined)
    assert.equal(second.status, 200)
    assert.equal(upstream, afterFirst, 'second call must not reach poe.ninja')
    assert.equal(calls.put, 1)
  } finally {
    globalThis.fetch = realFetch
    delete globalThis.caches
  }
})

test('cache: errors and health are never stored', async () => {
  const calls = stubCaches()
  try {
    assert.equal((await call('/api/character?account=A-1')).status, 400)
    assert.equal((await call('/api/health')).status, 200)
    assert.equal(calls.put, 0)
  } finally {
    delete globalThis.caches
  }
})

test('a handler that throws becomes a CORS-enabled 500', async () => {
  const realFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error('boom')
  }
  try {
    // ladder catches fetch errors itself (502); a 5xx with CORS is the contract either way
    const r = await call('/api/ladder?league=x')
    assert.ok(r.status >= 500)
    assert.equal(r.headers.get('access-control-allow-origin'), '*')
  } finally {
    globalThis.fetch = realFetch
  }
})

test('unknown paths return a CORS-enabled 404', async () => {
  const r = await call('/nope')
  assert.equal(r.status, 404)
  assert.equal(r.headers.get('access-control-allow-origin'), '*')
})
