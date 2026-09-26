import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test as base, expect } from '@playwright/test'

/**
 * Every test runs offline: requests leaving localhost are refused, except the
 * character proxy, which answers with the captured fixture the core tests use.
 * Console errors and uncaught exceptions fail the test.
 */
// Playwright runs from apps/web (where its config lives).
const character = readFileSync(resolve('../../packages/core/test/fixtures/athrynas-v43.json'))

export const PROFILE_URL = 'https://poe.ninja/poe2/profile/Demonad112-2589/runesofaldur/character/Athrynas'

export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
      page.on('console', (m) => {
        // Refused external requests log as failed loads; those are the test's doing.
        if (m.type() === 'error' && !/Failed to load resource|net::ERR_FAILED/.test(m.text())) errors.push(m.text())
      })
      await page.route(/^https?:\/\/(?!localhost)/, async (route) => {
        const url = route.request().url()
        if (url.includes('/api/character')) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: character })
        } else if (url.includes('/api/ladder')) {
          await route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"offline"}' })
        } else {
          await route.abort()
        }
      })
      await use(errors)
      expect(errors, 'console errors').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
