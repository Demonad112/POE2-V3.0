import { PROFILE_URL, expect, test } from './fixtures'

const importUrl = `character/?import=${encodeURIComponent(PROFILE_URL)}`

test('?import= analyses the character and records it for the home page', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  // The recent-character chip lives in the collapsed "Load another character".
  await page.getByText('Load another character').click()
  await expect(page.getByRole('button', { name: /^Athrynas/ })).toBeVisible()

  await page.goto('')
  const card = page.getByRole('region', { name: /Athrynas/ })
  await expect(card).toBeVisible()
  await expect(card.getByRole('link', { name: /Re-import/ })).toHaveAttribute('href', /import=/)
})

test('closed analysis panels mount while idle, so their text is findable', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  const gear = page.locator('details#gear')
  await expect(gear).not.toHaveAttribute('open')
  // The workbench's own heading exists inside the still-closed panel.
  await expect(gear.getByText('Gear workbench', { exact: true })).toBeAttached({ timeout: 15_000 })
})

test('a workbench edit is saved and restored after a reload', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  const gear = page.locator('details#gear')
  await gear.locator('summary').click()
  await gear.locator('li button[aria-expanded]').first().click()
  await gear.getByRole('button', { name: /^Remove / }).first().click()
  await expect(gear.getByRole('button', { name: /1 change · reset/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  await page.locator('details#gear summary').click()
  await expect(page.locator('details#gear').getByRole('button', { name: /1 change · reset/ })).toBeVisible({
    timeout: 15_000,
  })
})
