import { PROFILE_URL, expect, test } from './fixtures'

test.describe('desktop layout', () => {
  test.skip(({ isMobile }) => isMobile, 'wide screens only')

  test('the Atlas map stays beside the guide, so "Map" needs no scroll', async ({ page }) => {
    await page.goto('atlas/')
    const map = page.locator('#atlas-map')
    await expect(map).toBeVisible()
    // A Map button well down the guide: the page is scrolled past the top.
    const button = page.getByRole('button', { name: /on the Atlas tree$/ }).last()
    await button.scrollIntoViewIfNeeded()
    const before = await page.evaluate(() => window.scrollY)
    expect(before).toBeGreaterThan(200)
    await expect(map).toBeInViewport({ ratio: 0.6 })

    await button.click()
    await expect(page.getByText(/^Showing /)).toBeVisible()
    expect(await page.evaluate(() => window.scrollY)).toBe(before)
  })

  test('findings flow into two columns', async ({ page }) => {
    await page.goto(`character/?import=${encodeURIComponent(PROFILE_URL)}`)
    await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
    const cards = page.locator('section:has(> div > h2:text-is("Findings")) > ul > li')
    expect(await cards.count()).toBeGreaterThan(1)
    const [a, b] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()]
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2)
    expect(b!.x).toBeGreaterThan(a!.x + a!.width)
  })
})
