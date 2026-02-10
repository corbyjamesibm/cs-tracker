import { test, expect } from '@playwright/test';

test.describe('Reports Page', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/reports.html');
    await page.waitForLoadState('networkidle');
  });

  test('reports page loads successfully', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/Reports/);

    // Verify header is visible
    await expect(page.locator('.header__title')).toContainText('Reports');
    await expect(page.locator('.header__subtitle')).toContainText('Analytics and insights');
  });

  test('navigation shows Reports as active', async ({ page }) => {
    // Verify Reports nav link is marked active
    const reportsNavLink = page.locator('.side-nav__link').filter({ hasText: 'Reports' });
    await expect(reportsNavLink).toHaveClass(/active/);
  });

  test('portfolio reports section is visible', async ({ page }) => {
    // Verify Portfolio Reports section
    await expect(page.locator('text=Portfolio Reports')).toBeVisible();

    // Verify report cards are present
    await expect(page.locator('text=Portfolio Summary')).toBeVisible();
    await expect(page.locator('text=Health Trends')).toBeVisible();
    await expect(page.locator('text=Renewal Forecast')).toBeVisible();
  });

  test('assessment analytics section is visible', async ({ page }) => {
    // Verify Assessment Analytics section
    await expect(page.locator('text=Assessment Analytics')).toBeVisible();

    // Verify report cards are present
    await expect(page.locator('text=Assessment Summary')).toBeVisible();
    await expect(page.locator('text=Maturity Comparison')).toBeVisible();
    await expect(page.locator('text=Progress Tracking')).toBeVisible();
  });

  test('operational reports section is visible', async ({ page }) => {
    // Verify Operational Reports section
    await expect(page.locator('text=Operational Reports')).toBeVisible();

    // Verify report cards are present
    await expect(page.locator('text=Roadmap Status')).toBeVisible();
    await expect(page.locator('text=Task Metrics')).toBeVisible();
    await expect(page.locator('text=Activity Timeline')).toBeVisible();
  });

  test('clicking Portfolio Summary navigates to customers', async ({ page }) => {
    const portfolioSummaryCard = page.locator('.report-card').filter({ hasText: 'Portfolio Summary' });
    await portfolioSummaryCard.click();

    // Should navigate to customers page
    await expect(page).toHaveURL(/customers\.html/);
  });

  test('clicking Renewal Forecast navigates to renewals filter', async ({ page }) => {
    const renewalCard = page.locator('.report-card').filter({ hasText: 'Renewal Forecast' });
    await renewalCard.click();

    // Should navigate to customers page with renewals filter
    await expect(page).toHaveURL(/customers\.html\?filter=renewals/);
  });

  test('clicking Task Metrics navigates to tasks', async ({ page }) => {
    const taskMetricsCard = page.locator('.report-card').filter({ hasText: 'Task Metrics' });
    await taskMetricsCard.click();

    // Should navigate to tasks page
    await expect(page).toHaveURL(/tasks\.html/);
  });

  test('clicking Maturity Comparison navigates to comparison report', async ({ page }) => {
    const maturityCard = page.locator('.report-card').filter({ hasText: 'Maturity Comparison' });
    await maturityCard.click();

    // Should navigate to maturity comparison report
    await expect(page).toHaveURL(/reports\/maturity-comparison\.html/);
  });

  test('coming soon reports show toast message', async ({ page }) => {
    // Click on a coming soon report (Progress Tracking)
    const comingSoonCard = page.locator('.report-card.coming-soon').first();
    await comingSoonCard.click();

    // Should show toast message (toast uses inline styles, not a class)
    const toast = page.locator('text=coming soon');
    await expect(toast).toBeVisible({ timeout: 3000 });
  });

  test('can navigate to reports from other pages', async ({ page }) => {
    // Start from dashboard
    await page.goto('/index.html');
    await page.waitForLoadState('networkidle');

    // Click Reports in navigation
    const reportsLink = page.locator('.side-nav__link').filter({ hasText: 'Reports' });
    await reportsLink.click();

    // Should be on reports page
    await expect(page).toHaveURL(/reports\.html/);
    await expect(page.locator('.header__title')).toContainText('Reports');
  });
});
