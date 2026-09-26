import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

/**
 * Ctrl+K once the page has hydrated. Not retried: the shortcut toggles, so a
 * second press would close a palette that was only slow to load.
 */
async function openSearch(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('Control+k')
  const input = page.getByPlaceholder(/Search steps/)
  await expect(input).toBeVisible()
  return input
}

const ROUTES = [
  { path: '', heading: /Path of Exile 2/ },
  { path: 'checklist/', heading: 'Progression Checklist' },
  { path: 'atlas/', heading: /Atlas/ },
  { path: 'dashboard/', heading: /Dashboard/ },
  { path: 'character/', heading: /Character/ },
]

for (const scheme of ['dark', 'light'] as const) {
  for (const { path, heading } of ROUTES) {
    test(`/${path} renders in ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: heading }).first()).toBeVisible()
      // Nothing may scroll the page sideways on a phone.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(1)
    })
  }
}

test('ticking the next step on the home page survives a reload', async ({ page }) => {
  await page.goto('')
  const title = page.locator('#next-step-title')
  const first = await title.textContent()
  await page.getByRole('button', { name: /Mark done/ }).click()
  await expect(title).not.toHaveText(first!)
  const second = await title.textContent()
  await page.reload()
  await expect(title).toHaveText(second!)
  // Saved under the long-standing progress key, which must never change.
  const saved = await page.evaluate(() => localStorage.getItem('poe2-endgame-companion:v1'))
  expect(saved).toContain('"completedStepIds":[')
})

test('a same-page search result switches the dashboard to its tab', async ({ page }) => {
  await page.goto('dashboard/')
  await (await openSearch(page)).fill('Xesht')
  await page.getByRole('dialog').getByText('Xesht').first().click()
  await expect(page.locator('#xesht')).toBeVisible()
})

test('a cross-page search result lands on its section', async ({ page }) => {
  await page.goto('')
  await (await openSearch(page)).fill('Xesht')
  await page.getByRole('dialog').getByText('Xesht').first().click()
  await expect(page).toHaveURL(/dashboard\/?#xesht/)
  await expect(page.locator('#xesht')).toBeVisible()
})
