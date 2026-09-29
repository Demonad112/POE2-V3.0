import { PROFILE_URL, expect, test } from './fixtures'

const importUrl = `character/?import=${encodeURIComponent(PROFILE_URL)}`

async function importCharacter(page: import('@playwright/test').Page) {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
}

test('a workbench draft goes onto the shopping list', async ({ page }) => {
  await importCharacter(page)
  const gear = page.locator('details#gear')
  await gear.locator('summary').click()
  await gear.locator('li button[aria-expanded]').first().click()
  await gear.getByRole('button', { name: /^Remove / }).first().click()
  await gear.getByRole('button', { name: 'Add draft to shopping list' }).click()
  await expect(gear.getByText('on shopping list', { exact: true })).toBeVisible()

  await page.goto('checklist/')
  await expect(page.getByText(/: rework /).first()).toBeVisible()
  await expect(page.getByText('Changes to make:')).toBeVisible()
})

test('"Copy link" copies a link that re-imports this character', async ({ page }) => {
  await page.addInitScript(() => {
    // Deterministic across devices: no share sheet, and a clipboard we can read back.
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (t: string) => void ((window as unknown as { copied: string }).copied = t) },
      configurable: true,
    })
  })
  await importCharacter(page)
  await page.getByRole('button', { name: 'Copy link' }).click()
  await expect(page.getByText('Link copied')).toBeVisible()
  const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied)
  expect(new URL(copied).searchParams.get('import')).toBe(PROFILE_URL)
})

test('two imported characters can be compared', async ({ page }) => {
  await importCharacter(page)
  // Wait for this character's snapshot, then add a second character as if it
  // had been imported before.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('poe2-endgame-companion:v1')?.includes('"snapshots":[{') ?? false))
    .toBe(true)
  await page.evaluate(() => {
    const key = 'poe2-endgame-companion:v1'
    const state = JSON.parse(localStorage.getItem(key)!)
    const mine = state.character.snapshots[0]
    state.character.snapshots.push({ ...mine, key: 'Other/Bob', life: mine.life + 500, at: '2026-09-01T00:00:00Z' })
    localStorage.setItem(key, JSON.stringify(state))
    const recentsKey = 'poe2-endgame-companion:recent-characters:v1'
    const recents = JSON.parse(localStorage.getItem(recentsKey) ?? '[]')
    recents.push({ url: 'https://poe.ninja/poe2/profile/Other/x/character/Bob', key: 'Other/Bob', name: 'Bob', className: null, level: 80, at: '2026-09-01T00:00:00Z' })
    localStorage.setItem(recentsKey, JSON.stringify(recents))
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  const panel = page.locator('details#compare')
  await panel.locator('summary').click()
  await expect(panel.getByRole('columnheader', { name: /Bob/ })).toBeVisible()
  await expect(panel.getByRole('rowheader', { name: 'Life' })).toBeVisible()
})
