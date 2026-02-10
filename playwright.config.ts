import { defineConfig, devices } from '@playwright/test';

/**
 * CS Tracker Playwright E2E Test Configuration
 *
 * Run all tests: npx playwright test
 * Run specific file: npx playwright test tests/e2e/login.spec.ts
 * Run with UI: npx playwright test --ui
 * Debug mode: npx playwright test --debug
 */

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Test file pattern
  testMatch: '**/*.spec.ts',

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/e2e/reports' }],
    ['json', { outputFile: 'tests/e2e/reports/results.json' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigating - use frontend (nginx) on port 3000
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording
    video: 'on-first-retry',

    // Viewport size
    viewport: { width: 1280, height: 720 },

    // Emulate timezone
    timezoneId: 'America/New_York',
  },

  // Configure projects for different browsers
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Main test project with Chrome
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved auth state
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Firefox tests
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Safari tests (WebKit)
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Mobile Chrome tests
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Web server configuration - uses already running containers
  // Start containers with: podman-compose up -d
  webServer: {
    command: 'echo "Using existing containers - ensure podman-compose is running"',
    url: 'http://localhost:3000/',
    reuseExistingServer: true,
    timeout: 10 * 1000,
  },
});
