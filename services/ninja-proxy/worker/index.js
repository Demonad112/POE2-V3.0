/**
 * Cloudflare Workers entry for the poe.ninja proxy.
 *
 * The three handlers in ../api were written against Vercel's Node signature
 * (`req.query`, `res.status().json()`). They use only fetch, TextDecoder and
 * AbortController, so they run unchanged in Workers behind this small shim
 * rather than being rewritten and drifting from the tested originals.
 *
 * Vercel also caches on `s-maxage` automatically. Workers does not, so a
 * cacheable 200 is put in the edge cache here — without it every visitor asking
 * for the same ladder would decode a fresh poe.ninja protobuf.
 *
 * NOTE: Cloudflare documents the Cache API as a no-op on *.workers.dev. It only
 * takes effect on a custom domain or zone route. Until one is attached, every
 * request is served uncached; the code is still correct.
 */

import character from '../api/character.js'
import ladder from '../api/ladder.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

/** Same shape as api/health.js, minus the Vercel-only variables that do not exist here. */
function health(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  return res.status(200).json({
    ok: true,
    service: 'poe2-v3-ninja-proxy',
    endpoints: ['/api/character', '/api/ladder', '/api/health'],
    runtime: 'cloudflare-workers',
  })
}

const ROUTES = {
  '/api/character': character,
  '/api/ladder': ladder,
  '/api/health': health,
}

/** Minimal Node-style response that collects what a handler writes. */
function makeRes() {
  const state = { status: 200, headers: new Headers(), body: null }
  const res = {
    setHeader(name, value) {
      state.headers.set(name, value)
      return res
    },
    status(code) {
      state.status = code
      return res
    },
    json(value) {
      state.headers.set('Content-Type', 'application/json; charset=utf-8')
      state.body = JSON.stringify(value)
      return res
    },
    send(value) {
      state.body = value
      return res
    },
    end() {
      return res
    },
  }
  return { res, state }
}

export async function handle(request, ctx) {
  const url = new URL(request.url)
  const route = ROUTES[url.pathname.replace(/\/+$/, '')]

  if (!route) {
    return new Response(JSON.stringify({ error: 'Not found.' }), {
      status: 404,
      headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const cache = typeof caches !== 'undefined' ? caches.default : null
  const cacheable = cache && request.method === 'GET' && url.pathname !== '/api/health'
  if (cacheable) {
    const hit = await cache.match(request)
    if (hit) return hit
  }

  const { res, state } = makeRes()
  try {
    await route({ method: request.method, query: Object.fromEntries(url.searchParams) }, res)
  } catch (err) {
    // Without this an unexpected throw surfaces as a Cloudflare error page with no CORS headers.
    return new Response(JSON.stringify({ error: `Proxy error: ${err?.message}` }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  // A 204 must not carry a body, and every handler ends one with no body set.
  const response = new Response(state.status === 204 ? null : state.body, {
    status: state.status,
    headers: state.headers,
  })

  if (cacheable && state.status === 200 && /s-maxage/.test(state.headers.get('Cache-Control') ?? '')) {
    const put = cache.put(request, response.clone())
    if (ctx?.waitUntil) ctx.waitUntil(put)
    else await put
  }
  return response
}

export default {
  fetch(request, _env, ctx) {
    return handle(request, ctx)
  },
}
