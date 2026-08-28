import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests (Build Plan §7 milestone 11).
 *
 * Runs against a real dev server and the real database, because the things
 * worth checking here — a session surviving a redirect, a server component
 * withholding content, a CSV route's headers — are exactly the things a unit
 * test with a mocked `db` cannot see.
 *
 * Chrome is used through `channel` rather than a downloaded browser bundle, so
 * the suite runs on a machine that already has Chrome without a 400MB install
 * step. CI installs the bundled browser instead (PLAYWRIGHT_BUNDLED=1).
 */

const PORT = Number(process.env.E2E_PORT ?? 3100)
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  // The fixture is one shared dataset, and several specs sign in as the same
  // people. Running files in parallel would have them treading on each other.
  workers: 1,
  fullyParallel: false,
  // A failing E2E test is nearly always a real failure; retrying hides flakes
  // rather than fixing them. One retry in CI only, for genuine network noise.
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  globalSetup:    './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: process.env.PLAYWRIGHT_BUNDLED
        ? { ...devices['Desktop Chrome'] }
        : { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  // Reusing an already-running server locally keeps the loop fast; CI always
  // starts its own.
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: `next dev --turbopack --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
