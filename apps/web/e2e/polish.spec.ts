import type { Locator } from '@playwright/test'
import { expect, test } from './fixtures'

/**
 * True when a tap 11px above and below the control's centre still lands on it:
 * the hit area is at least 22px tall however small the control draws. The
 * `hit-area` utility targets 24px; 11px keeps the check off sub-pixel edges.
 */
async function tapsWithin24px(target: Locator) {
  await target.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  return target.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    return [cy - 11, cy + 11].every((y) => {
      const hit = document.elementFromPoint(cx, y)
      return !!hit && (hit === el || el.contains(hit))
    })
  })
}

test.describe('small controls have a 24px tap area', () => {
  test('footer links', async ({ page }) => {
    await page.goto('')
    expect(await tapsWithin24px(page.getByRole('link', { name: 'View source' }))).toBe(true)
    expect(await tapsWithin24px(page.getByRole('button', { name: 'Reset all progress' }))).toBe(true)
  })

  test('dashboard sort chips', async ({ page }) => {
    await page.goto('dashboard/')
    expect(await tapsWithin24px(page.getByRole('button', { name: 'Cheapest' }))).toBe(true)
  })

  test('Atlas "Map" buttons', async ({ page }) => {
    await page.goto('atlas/')
    expect(await tapsWithin24px(page.getByRole('button', { name: 'Show Trapped Subordinate on the Atlas tree' }))).toBe(true)
  })

  test('checklist video timestamps', async ({ page }) => {
    await page.goto('checklist/')
    expect(await tapsWithin24px(page.locator('main a[href*="youtu"]:visible').first())).toBe(true)
  })
})

test('the patch banner stays closed for this patch and returns on the next', async ({ page }) => {
  await page.goto('')
  const banner = page.locator('.patch-banner')
  await expect(banner).toBeVisible()
  await page.getByRole('button', { name: 'Dismiss patch notice' }).click()
  await expect(banner).toBeHidden()
  await page.reload()
  await expect(banner).toBeHidden()

  // A dismissal from an older patch doesn't carry over.
  await page.evaluate(() => localStorage.setItem('poe2-endgame-companion:banner-dismissed:v1', '0.0.1'))
  await page.reload()
  await expect(banner).toBeVisible()
})

test('the patch banner is one line on phones', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only')
  await page.goto('')
  const box = await page.locator('.patch-banner').boundingBox()
  expect(box!.height).toBeLessThan(34)
})
