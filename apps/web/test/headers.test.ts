import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PROXY_BASE } from '../src/lib/proxy'

describe('Cloudflare _headers', () => {
  const csp = readFileSync(resolve(__dirname, '../public/_headers'), 'utf8')
    .split('\n')
    .find((l) => l.trim().startsWith('Content-Security-Policy:'))

  it('lets the page connect to the import proxy', () => {
    const connect = /connect-src ([^;]+)/.exec(csp ?? '')?.[1].split(/\s+/) ?? []
    expect(connect).toContain(new URL(PROXY_BASE).origin)
  })
})
