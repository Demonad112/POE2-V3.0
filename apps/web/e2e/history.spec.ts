import { PROFILE_URL, expect, test } from './fixtures'

test('the Progress panel charts each figure across imports', async ({ page }) => {
  await page.goto(`character/?import=${encodeURIComponent(PROFILE_URL)}`)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('poe2-endgame-companion:v1')?.includes('"snapshots":[{') ?? false))
    .toBe(true)
  // Two earlier imports of the same character, one without a DPS reading.
  await page.evaluate(() => {
    const key = 'poe2-endgame-companion:v1'
    const state = JSON.parse(localStorage.getItem(key)!)
    const now = state.character.snapshots[0]
    state.character.snapshots = [
      { ...now, at: '2026-09-01T00:00:00Z', life: now.life - 400, dps: 0 },
      { ...now, at: '2026-09-10T00:00:00Z', life: now.life - 200 },
      now,
    ]
    localStorage.setItem(key, JSON.stringify(state))
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })

  const panel = page.locator('details#progress')
  await panel.locator('summary').click()
  const chart = panel.getByRole('img', { name: /Trends across 3 imports/ })
  await expect(chart).toBeVisible()
  await expect(chart.locator('li')).toHaveCount(4)
  await expect(chart.getByText(/▲ \+400 since/)).toBeVisible()

  await panel.getByText('Show as a table').click()
  await expect(panel.getByRole('rowheader')).toHaveCount(3)
})
