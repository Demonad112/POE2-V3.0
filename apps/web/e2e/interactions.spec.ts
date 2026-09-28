import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from './fixtures'

test('the theme toggle cycles dark → light → system and survives a reload', async ({ page }) => {
  await page.goto('')
  const toggle = page.getByRole('button', { name: /Switch to/ })
  const html = page.locator('html')
  // Starts on system; one click is dark, the next light.
  await toggle.click()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await toggle.click()
  await expect(html).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: /Switch to/ }).click()
  await expect(html).not.toHaveAttribute('data-theme', /.+/)
})

test('an Atlas "Map" button focuses that node on the tree', async ({ page }) => {
  await page.goto('atlas/')
  await page.getByRole('button', { name: 'Show Trapped Subordinate on the Atlas tree' }).click()
  await expect(page.getByText('Showing Trapped Subordinate')).toBeVisible()
})

test('ticking an Atlas node moves the allocation bar', async ({ page }) => {
  await page.goto('atlas/')
  await page.getByRole('checkbox', { name: 'Allocated Trapped Subordinate' }).check()
  await expect(page.getByRole('tab', { name: /Path 1\/17/ })).toBeVisible()
})

test('the strategy quiz recommends once every answer is given', async ({ page }) => {
  await page.goto('dashboard/')
  const selects = page.locator('main select')
  await expect(selects).toHaveCount(3)
  for (let i = 0; i < 3; i++) {
    await selects.nth(i).selectOption({ index: 1 })
  }
  await expect(page.getByText('Recommended for you')).toBeVisible()
})

test('dashboard sort and row expansion work', async ({ page }) => {
  await page.goto('dashboard/')
  await page.getByRole('button', { name: 'Cheapest' }).click()
  await expect(page.getByRole('button', { name: 'Cheapest' })).toHaveAttribute('aria-pressed', 'true')
  const first = page.locator('#strategies details, [role=tabpanel] details').first()
  await first.locator('summary').click()
  await expect(first).toHaveAttribute('open', '')
})

test('"Hide completed" hides a ticked step, and reset clears progress', async ({ page }) => {
  await page.goto('checklist/')
  const step = page.getByText('Finish campaign, enter the Ziggurat Refuge', { exact: true }).last()
  await page.getByRole('button', { name: /Mark done/ }).click()
  await page.getByLabel('Hide completed').check()
  await expect(step).toBeHidden()

  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Reset all progress' }).click()
  await expect(page.getByText('Step 1 of 31 · 0 done')).toBeVisible()
})

test('a Path of Building code imports and shows its own analysis', async ({ page }) => {
  const payload = JSON.parse(readFileSync(resolve('../../packages/core/test/fixtures/athrynas-v43.json'), 'utf8'))
  const code: string = (payload.charModel ?? payload).pathOfBuildingExport
  await page.goto('character/')
  await page.getByRole('tab', { name: 'Paste data' }).click()
  await page.getByLabel('Character model JSON or Path of Building code').fill(code)
  await page.getByRole('button', { name: 'Analyse pasted data' }).click()
  await expect(page.getByText('Imported from a Path of Building code')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('What a code cannot tell you')).toBeVisible()
  // Next's route announcer is also role=alert, so check for the app's own error text.
  await expect(page.getByText(/Could not analyse|neither valid JSON/)).toHaveCount(0)
})
