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
  await expect(page.getByText('Step 1 of 32 · 0 done')).toBeVisible()
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

test('a search string copies exactly as written, quotes included', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('atlas/')
  await page.locator('#atlas-regex > summary').click()
  await page.getByRole('button', { name: 'Copy Soft bricks, group 1 (hard avoid)' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toBeVisible()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe('"Hiveseeding|Fittest|Lost Architect|Rivalry"')
})

test('the soft-brick list is grouped and warns that the tree cannot be respecced', async ({ page }) => {
  await page.goto('atlas/#trap-mysterious-transference')
  await expect(page.getByText('Do not allocate.')).toBeVisible()
  await expect(page.getByText('Group 1 · hard avoid')).toBeVisible()
  await expect(page.locator('#trap-mysterious-transference')).toBeVisible()
})

test('the checklist carries the 0.5.5 change table, Trial of Chaos and essence panels', async ({ page }) => {
  await page.goto('checklist/')
  for (const id of ['#patch-0-5-5-changes', '#trial-of-chaos', '#essence-crafting']) {
    await page.locator(`${id} > summary`).click()
  }
  await expect(page.getByText('Arbiter of Divinity ×5').first()).toBeVisible()
  await expect(page.getByText('Wager of the Future').first()).toBeVisible()
  await expect(page.getByText('Omen of Sinistral Crystallisation').first()).toBeVisible()
  await expect(page.getByText('Pick your track: fast-track to T15, or park at T11').first()).toBeAttached()
})

test('new panels cause no horizontal overflow', async ({ page }) => {
  for (const path of ['atlas/', 'checklist/']) {
    await page.goto(path)
    for (const id of ['#atlas-regex', '#patch-0-5-5-changes', '#trial-of-chaos', '#essence-crafting']) {
      const el = page.locator(`${id} > summary`)
      if (await el.count()) await el.click()
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, path).toBeLessThanOrEqual(0)
  }
})
