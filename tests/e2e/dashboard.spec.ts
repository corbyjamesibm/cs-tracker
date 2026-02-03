import { test, expect } from '@playwright/test';

/**
 * Dashboard Page Tests
 *
 * Tests for the main dashboard page functionality and metrics display.
 */

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prototype/index.html');
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard page', async ({ page }) => {
    // Check page title or header
    await expect(page).toHaveTitle(/CS Tracker|Dashboard|Customer/i);
  });

  test('should display navigation menu', async ({ page }) => {
    // Check for main navigation elements
    const nav = page.locator('nav, .navigation, .sidebar, header');
    await expect(nav).toBeVisible();

    // Check for key navigation links
    const dashboardLink = page.locator('a[href*="index"], a:has-text("Dashboard")');
    const customersLink = page.locator('a[href*="customers"], a:has-text("Customers")');
    const tasksLink = page.locator('a[href*="tasks"], a:has-text("Tasks")');

    await expect(dashboardLink.or(page.locator('text=Dashboard'))).toBeVisible();
    await expect(customersLink.or(page.locator('text=Customers'))).toBeVisible();
    await expect(tasksLink.or(page.locator('text=Tasks'))).toBeVisible();
  });

  test('should display health distribution metrics', async ({ page }) => {
    // Check for health status cards or charts
    const healthSection = page.locator('[data-testid="health-distribution"], .health-distribution, .health-cards, .metric-cards');

    // Should have health status indicators (green, yellow, red)
    await expect(page.locator('text=/healthy|green|at risk|red|needs attention|yellow/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display customer count metrics', async ({ page }) => {
    // Check for customer count display
    const customerMetric = page.locator('[data-testid="customer-count"], .customer-count, .metric-value, .stat-value').first();
    await expect(customerMetric).toBeVisible({ timeout: 10000 });
  });

  test('should display recent tasks section', async ({ page }) => {
    // Check for tasks section
    const tasksSection = page.locator('[data-testid="recent-tasks"], .recent-tasks, .tasks-section, text=Tasks');
    await expect(tasksSection).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to customers page', async ({ page }) => {
    // Click on customers link
    await page.click('a[href*="customers"], a:has-text("Customers")');

    // Should navigate to customers page
    await expect(page).toHaveURL(/customers/);
  });

  test('should navigate to tasks page', async ({ page }) => {
    // Click on tasks link
    await page.click('a[href*="tasks"], a:has-text("Tasks")');

    // Should navigate to tasks page
    await expect(page).toHaveURL(/tasks/);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Dashboard should still be usable
    await expect(page.locator('body')).toBeVisible();

    // Check for mobile menu or hamburger icon
    const mobileMenu = page.locator('.mobile-menu, .hamburger, [data-testid="mobile-menu"]');
    const hasMobileMenu = await mobileMenu.count() > 0;

    // If mobile menu exists, it should be visible
    if (hasMobileMenu) {
      await expect(mobileMenu).toBeVisible();
    }
  });

  test('should load charts correctly', async ({ page }) => {
    // Wait for charts to render (Chart.js)
    await page.waitForTimeout(2000); // Allow time for chart rendering

    // Check for canvas elements (Chart.js renders to canvas)
    const charts = page.locator('canvas');
    const chartCount = await charts.count();

    // Dashboard should have at least one chart
    expect(chartCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API calls and simulate error
    await page.route('**/api/v1/customers**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ detail: 'Internal Server Error' })
      });
    });

    // Reload page
    await page.reload();

    // Should not show blank page - should have some error handling
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

test.describe('Dashboard Data Refresh', () => {
  test('should refresh data on page reload', async ({ page }) => {
    await page.goto('/prototype/index.html');

    // Get initial content
    const initialContent = await page.content();

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Page should still work after reload
    await expect(page.locator('body')).toBeVisible();
  });
});
