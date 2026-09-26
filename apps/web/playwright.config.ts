import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke tests against the static export in `out/` — build first
 * (`npm run build -w @poe2/web`), then `npm run e2e -w @poe2/web`.
 *
 * The base path mirrors next.config.ts: CI builds under the repository name,
 * so the served site must live there too or every asset 404s.
 */
const isCI = process.env.GITHUB_ACTIONS === 'true'
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const basePath = isCI && repo ? `/${repo}` : ''
const port = 4321

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}${basePath}/`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node e2e/serve.mjs',
    url: `http://localhost:${port}${basePath}/`,
    reuseExistingServer: !isCI,
    env: { E2E_BASE_PATH: basePath, E2E_PORT: String(port) },
  },
})
