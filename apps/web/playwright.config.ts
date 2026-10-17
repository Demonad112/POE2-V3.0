import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke tests against the static export in `out/` — build first
 * (`npm run build -w @poe2/web`), then `npm run e2e -w @poe2/web`.
 *
 * The base path mirrors next.config.ts: CI builds under the repository name,
 * so the served site must live there too or every asset 404s.
 *
 * E2E_BASE_URL runs the same suite against a deployed site instead (the
 * post-deploy smoke run in .github/workflows/deploy.yml): no local server, and
 * the fixtures let that host through.
 */
const isCI = process.env.GITHUB_ACTIONS === 'true'
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const basePath = isCI && repo ? `/${repo}` : ''
const port = 4321
const deployed = process.env.E2E_BASE_URL

/**
 * Claude Code cloud sessions ship a Chromium whose revision rarely matches the
 * one this Playwright version wants, and `playwright install` is not allowed
 * there. So, in a cloud session only (never on GitHub Actions), launch the
 * preinstalled browser directly. Locally and in CI this is `undefined` and
 * Playwright uses its own download as before.
 */
function cloudChromium(): string | undefined {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (isCI || process.env.CLAUDE_CODE_REMOTE !== 'true' || !root || !existsSync(root)) return undefined
  const dir = readdirSync(root)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort()
    .pop()
  const exe = dir ? join(root, dir, 'chrome-linux', 'chrome') : undefined
  return exe && existsSync(exe) ? exe : undefined
}
const executablePath = cloudChromium()

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: deployed ?? `http://localhost:${port}${basePath}/`,
    trace: 'retain-on-failure',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: deployed
    ? undefined
    : {
        command: 'node e2e/serve.mjs',
        url: `http://localhost:${port}${basePath}/`,
        reuseExistingServer: !isCI,
        env: { E2E_BASE_PATH: basePath, E2E_PORT: String(port) },
      },
})
