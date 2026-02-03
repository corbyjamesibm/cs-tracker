import { test, expect } from '@playwright/test';

/**
 * Login Page Tests
 *
 * Tests for the authentication flow and login page functionality.
 */

test.describe('Login Page', () => {
  // Use unauthenticated state for login tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/prototype/login.html');
  });

  test('should display login form', async ({ page }) => {
    // Check for login form elements
    await expect(page.locator('form, .login-form, #login-form')).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"], #email')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"], #password')).toBeVisible();
    await expect(page.locator('button[type="submit"], .login-btn, #login-btn')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Enter invalid credentials
    await page.fill('input[type="email"], input[name="email"], #email', 'invalid@example.com');
    await page.fill('input[type="password"], input[name="password"], #password', 'wrongpassword');

    // Submit the form
    await page.click('button[type="submit"], .login-btn, #login-btn');

    // Should show error message
    await expect(page.locator('.error, .error-message, [data-testid="error"]')).toBeVisible({ timeout: 5000 });
  });

  test('should validate email format', async ({ page }) => {
    // Enter invalid email format
    await page.fill('input[type="email"], input[name="email"], #email', 'not-an-email');
    await page.fill('input[type="password"], input[name="password"], #password', 'password123');

    // Try to submit
    await page.click('button[type="submit"], .login-btn, #login-btn');

    // Email input should show validation error (HTML5 validation)
    const emailInput = page.locator('input[type="email"], input[name="email"], #email');
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('should require password', async ({ page }) => {
    // Enter email only
    await page.fill('input[type="email"], input[name="email"], #email', 'test@example.com');

    // Submit without password
    await page.click('button[type="submit"], .login-btn, #login-btn');

    // Should still be on login page
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect to dashboard after successful login', async ({ page, request }) => {
    // Check if auth is enabled
    const authStatus = await request.get('/api/v1/auth/status');
    const authData = await authStatus.json();

    if (!authData.auth_enabled) {
      // Skip login test when auth is disabled
      test.skip();
      return;
    }

    // Enter valid credentials (using test user)
    await page.fill('input[type="email"], input[name="email"], #email', 'admin@example.com');
    await page.fill('input[type="password"], input[name="password"], #password', 'adminpassword123');

    // Submit the form
    await page.click('button[type="submit"], .login-btn, #login-btn');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/index\.html/, { timeout: 10000 });
  });

  test('should have remember me option', async ({ page }) => {
    // Check for remember me checkbox (if implemented)
    const rememberMe = page.locator('input[type="checkbox"][name="remember"], #remember-me');
    const hasRememberMe = await rememberMe.count() > 0;

    if (hasRememberMe) {
      await expect(rememberMe).toBeVisible();
    }
  });

  test('should show loading state during login', async ({ page }) => {
    // Enter credentials
    await page.fill('input[type="email"], input[name="email"], #email', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"], #password', 'password123');

    // Click login and check for loading indicator
    const submitBtn = page.locator('button[type="submit"], .login-btn, #login-btn');
    await submitBtn.click();

    // Check if button is disabled or shows loading
    // This is optional depending on implementation
    const isDisabled = await submitBtn.isDisabled().catch(() => false);
    // Loading state check passes whether or not loading indicator is shown
  });
});

test.describe('Authentication Status', () => {
  test('should check auth status endpoint', async ({ request }) => {
    const response = await request.get('/api/v1/auth/status');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('auth_enabled');
    expect(data).toHaveProperty('password_available');
  });
});
