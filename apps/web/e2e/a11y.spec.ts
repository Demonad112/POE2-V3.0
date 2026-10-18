import AxeBuilder from '@axe-core/playwright'
import { PROFILE_URL, expect, test } from './fixtures'

// Automated WCAG A/AA rules only. This catches missing names, roles and contrast
// regressions; it is not a substitute for a manual pass (audit I-5).
// Add a rule id here only for a known, unfixed violation, with the reason.
const KNOWN = new Set<string>()

const pages: Array<[string, string]> = [
  ['home', ''],
  ['character', `character/?import=${encodeURIComponent(PROFILE_URL)}`],
  ['checklist', 'checklist/'],
]

for (const [name, path] of pages) {
  test(`${name} has no serious or critical accessibility violations`, async ({ page }) => {
    await page.goto(path)
    if (name === 'character') {
      await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const blocking = results.violations.filter((v) => (v.impact === 'serious' || v.impact === 'critical') && !KNOWN.has(v.id))
    expect(
      blocking.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`),
    ).toEqual([])
  })
}
