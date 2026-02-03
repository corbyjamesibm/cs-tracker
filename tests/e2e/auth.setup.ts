import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

/**
 * Authentication Setup
 *
 * This setup runs before all other tests to establish an authenticated session.
 * The authentication state is saved and reused by all other tests.
 */
setup('authenticate', async ({ page, request }) => {
  // First, check if auth is enabled
  const authStatus = await request.get('/api/v1/auth/status');
  const authData = await authStatus.json();

  if (!authData.auth_enabled) {
    // Auth is disabled, no need to login
    // Just visit the app and save empty state
    await page.goto('/prototype/index.html');
    await page.waitForLoadState('networkidle');
    await page.context().storageState({ path: authFile });
    return;
  }

  // Navigate to login page
  await page.goto('/prototype/login.html');

  // Wait for the login form to be visible
  await expect(page.locator('form, .login-form, #login-form')).toBeVisible({ timeout: 10000 });

  // Fill in credentials
  // Note: Adjust these selectors based on actual login form
  await page.fill('input[type="email"], input[name="email"], #email', 'admin@example.com');
  await page.fill('input[type="password"], input[name="password"], #password', 'adminpassword123');

  // Submit the form
  await page.click('button[type="submit"], .login-btn, #login-btn');

  // Wait for navigation to dashboard or successful login indicator
  await page.waitForURL('**/index.html**', { timeout: 15000 }).catch(() => {
    // If URL doesn't change, check for dashboard content
  });

  // Verify we're logged in by checking for dashboard elements
  await expect(page.locator('.dashboard, .main-content, [data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });

  // Save authentication state
  await page.context().storageState({ path: authFile });
});

/**
 * Setup for tests that need a clean slate (no auth)
 */
setup.describe('no-auth setup', () => {
  setup.use({ storageState: { cookies: [], origins: [] } });

  setup('create unauthenticated state', async ({ page }) => {
    // Create an unauthenticated state file for tests that need it
    await page.context().storageState({
      path: path.join(__dirname, '.auth/no-auth.json')
    });
  });
});
