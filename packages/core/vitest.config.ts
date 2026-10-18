import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // `npm run test:coverage` fails below these floors (measured 91.3% statements,
    // 79.6% branches); CI runs it. Raise them as coverage grows, never lower.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: { statements: 90, branches: 75 },
    },
  },
})
