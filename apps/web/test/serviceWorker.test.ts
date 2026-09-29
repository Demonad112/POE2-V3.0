import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The offline worker (public/sw.js), run against an in-memory Cache Storage.
 *
 * The data files are served cache-first, so the only thing that gets a
 * returning visitor new data after a deploy is the version in the worker's URL
 * (sw.js?v=<hash of the data files>, see next.config.ts). These tests hold the
 * worker to that: a new version drops the old caches and reads the files from
 * the network again. A browser test of the same thing depends on when Chromium
 * hands a page to a new worker, which is not deterministic.
 */
const source = readFileSync(resolve(__dirname, '../public/sw.js'), 'utf8')
const ORIGIN = 'https://example.test'

type Stores = Map<string, Map<string, Response>>

function worker(version: string, stores: Stores, network: (url: string) => Response) {
  const handlers: Record<string, (e: unknown) => void> = {}
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)!
      const key = (r: Request | string) => (typeof r === 'string' ? new URL(r, ORIGIN).href : r.url)
      return {
        match: async (r: Request | string) => store.get(key(r))?.clone(),
        put: async (r: Request, res: Response) => void store.set(key(r), res),
      }
    },
  }
  const self = {
    location: { href: `${ORIGIN}/sw.js?v=${version}`, origin: ORIGIN },
    addEventListener: (type: string, fn: (e: unknown) => void) => (handlers[type] = fn),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  }
  const fetch = async (r: Request) => network(r.url)
  new Function('self', 'caches', 'fetch', source)(self, caches, fetch)

  const settle = async (type: string, extra: object = {}) => {
    let done: Promise<unknown> = Promise.resolve()
    handlers[type]({ ...extra, waitUntil: (p: Promise<unknown>) => (done = p), respondWith: (p: Promise<unknown>) => (done = p) })
    return done
  }
  return {
    activate: () => settle('activate'),
    /** Whether the worker answers this request itself rather than leaving it to the network. */
    answers: (url: string) => {
      let answered = false
      handlers.fetch({ request: new Request(url), respondWith: () => (answered = true) })
      return answered
    },
    get: async (path: string) => {
      const request = new Request(`${ORIGIN}${path}`)
      const res = (await settle('fetch', { request })) as Response
      await new Promise((r) => setTimeout(r, 0)) // cache.put runs after the response is handed back
      return res.text()
    },
  }
}

describe('offline worker', () => {
  it('serves a data file from cache until the data version changes', async () => {
    const stores: Stores = new Map()
    let deployed = 'old data'
    const network = () => new Response(deployed)

    const before = worker('a', stores, network)
    await before.activate()
    expect(await before.get('/monster-stats.json')).toBe('old data')

    deployed = 'new data'
    // Same version: cache-first, so the stored copy wins.
    expect(await before.get('/monster-stats.json')).toBe('old data')

    // A deploy with new data registers the worker under a new version.
    const after = worker('b', stores, network)
    await after.activate()
    expect([...stores.keys()].filter((k) => k.endsWith('-a'))).toEqual([])
    expect(await after.get('/monster-stats.json')).toBe('new data')
    expect([...stores.keys()]).toContain('poe2-data-b')
  })

  it('leaves character requests and other sites to the network', async () => {
    const w = worker('a', new Map(), () => new Response(''))
    expect(w.answers(`${ORIGIN}/api/character?account=x`)).toBe(false)
    expect(w.answers('https://poe.ninja/poe2/api/profile')).toBe(false)
    expect(w.answers('https://fonts.example/font.woff2')).toBe(false)
    expect(w.answers(`${ORIGIN}/passive-tree.json`)).toBe(true)
  })
})
