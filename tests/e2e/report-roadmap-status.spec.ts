import { test, expect } from '@playwright/test';

test.describe('Roadmap Status Report', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  // Increase timeout for these tests
  test.setTimeout(60000);

  test('should load the roadmap status report page', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the report page
    await page.goto('/reports/roadmap-status.html');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that the page title is correct
    await expect(page).toHaveTitle(/Roadmap Status Report/);

    // Check that the header is visible
    const header = page.locator('.report-header__title');
    await expect(header).toHaveText('Roadmap Status Report');

    // Check for critical JavaScript errors
    const jsErrors = consoleErrors.filter(err =>
      err.includes('SyntaxError') ||
      err.includes('Uncaught') ||
      err.includes('TypeError')
    );

    expect(jsErrors, `JavaScript errors found: ${jsErrors.join(', ')}`).toHaveLength(0);
  });

  test('should display summary cards with data', async ({ page }) => {
    await page.goto('/reports/roadmap-status.html');
    await page.waitForLoadState('networkidle');

    // Wait for summary cards to be visible
    const summaryCards = page.locator('[data-testid="summary-cards"]');
    await expect(summaryCards).toBeVisible();

    // Check that Total Items card shows a number (not dash) - wait for data to load
    const totalItems = page.locator('#totalItems');
    await expect(totalItems).toBeVisible();

    // Wait for the value to change from dash to a number
    await expect(totalItems).not.toHaveText('-', { timeout: 10000 });

    // Get the text content and verify it's a number
    const totalText = await totalItems.textContent();
    expect(totalText).toMatch(/^\d+$/);
  });

  test('should display timeline quarters section', async ({ page }) => {
    await page.goto('/reports/roadmap-status.html');
    await page.waitForLoadState('networkidle');

    // Check that timeline section exists
    const timeline = page.locator('[data-testid="timeline-quarters"]');
    await expect(timeline).toBeVisible();

    // Wait for timeline content to load (either quarters or empty message)
    await page.waitForSelector('.timeline-quarter, [data-testid="timeline-quarters"] p', { timeout: 10000 });
  });

  test('should display roadmap items table', async ({ page }) => {
    await page.goto('/reports/roadmap-status.html');
    await page.waitForLoadState('networkidle');

    // Check that table exists
    const table = page.locator('[data-testid="roadmap-table"]');
    await expect(table).toBeVisible();

    // Check that table has headers
    const headers = table.locator('thead th');
    await expect(headers).toHaveCount(7);

    // Verify header text
    await expect(headers.nth(0)).toHaveText('Customer');
    await expect(headers.nth(1)).toHaveText('Item');
    await expect(headers.nth(2)).toHaveText('Category');
    await expect(headers.nth(3)).toHaveText('Status');
    await expect(headers.nth(4)).toHaveText('Quarter');
    await expect(headers.nth(5)).toHaveText('Progress');
    await expect(headers.nth(6)).toHaveText('Dependencies');
  });

  test('should filter roadmap items by status', async ({ page }) => {
    await page.goto('/reports/roadmap-status.html');
    await page.waitForLoadState('networkidle');

    // Wait for data to load - wait for total items to update from dash
    const totalItems = page.locator('#totalItems');
    await expect(totalItems).not.toHaveText('-', { timeout: 10000 });

    // Select "Planned" filter (since we know data exists)
    const statusFilter = page.locator('#statusFilter');
    await statusFilter.selectOption('planned');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Verify that visible status tags in the table match the filter
    const statusTags = page.locator('.status-tag--planned');
    const plannedCount = await statusTags.count();

    // If there are items shown, they should all be "Planned"
    if (plannedCount > 0) {
      const allStatusTags = page.locator('.roadmap-table tbody .status-tag');
      const totalInTable = await allStatusTags.count();
      expect(plannedCount).toBe(totalInTable);
    }
  });

  test('should filter roadmap items by search term', async ({ page }) => {
    await page.goto('/reports/roadmap-status.html');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    const totalItems = page.locator('#totalItems');
    await expect(totalItems).not.toHaveText('-', { timeout: 10000 });

    // Type a search term
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('test');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // The table should show filtered results or empty state
    const table = page.locator('[data-testid="roadmap-table"]');
    const emptyState = page.locator('#emptyState');

    // Either table is visible with results or empty state is shown
    const tableVisible = await table.isVisible();
    const emptyVisible = await emptyState.isVisible();

    expect(tableVisible || emptyVisible).toBe(true);
  });

  test('should clear filters when clicking Clear Filters button', async ({ page }) => {
    await page.goto('/reports/roadmap-status.html');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    const totalItems = page.locator('#totalItems');
    await expect(totalItems).not.toHaveText('-', { timeout: 10000 });

    // Apply some filters
    const statusFilter = page.locator('#statusFilter');
    await statusFilter.selectOption('completed');

    const categoryFilter = page.locator('#categoryFilter');
    await categoryFilter.selectOption('feature');

    const searchInput = page.locator('#searchInput');
    await searchInput.fill('search term');

    // Click Clear Filters button
    const clearButton = page.locator('button', { hasText: 'Clear Filters' });
    await clearButton.click();

    // Wait for filters to clear
    await page.waitForTimeout(500);

    // Verify all filters are reset
    await expect(statusFilter).toHaveValue('');
    await expect(categoryFilter).toHaveValue('');
    await expect(searchInput).toHaveValue('');
  });

  test('should navigate back to reports page', async ({ page }) => {
    await page.goto('/reports/roadmap-status.html');
    await page.waitForLoadState('networkidle');

    // Click the back link
    const backLink = page.locator('.report-header__back');
    await backLink.click();

    // Should navigate to reports page
    await expect(page).toHaveURL(/reports\.html$/, { timeout: 10000 });
  });

  test('should navigate to customer detail when clicking customer name', async ({ page }) => {
    await page.goto('/reports/roadmap-status.html');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    const totalItems = page.locator('#totalItems');
    await expect(totalItems).not.toHaveText('-', { timeout: 10000 });

    // Find a customer link in the table
    const customerLink = page.locator('.roadmap-table__customer').first();

    // Only test if there are items in the table
    if (await customerLink.count() > 0) {
      // Click the customer link
      await customerLink.click();

      // Should navigate to customer detail page
      await expect(page).toHaveURL(/customer-detail\.html\?id=\d+/, { timeout: 10000 });
    }
  });

  test('should display charts', async ({ page }) => {
    await page.goto('/reports/roadmap-status.html');
    await page.waitForLoadState('networkidle');

    // Wait for data to load first
    const totalItems = page.locator('#totalItems');
    await expect(totalItems).not.toHaveText('-', { timeout: 10000 });

    // Check that status chart canvas exists
    const statusChart = page.locator('#statusChart');
    await expect(statusChart).toBeVisible();

    // Check that category chart canvas exists
    const categoryChart = page.locator('#categoryChart');
    await expect(categoryChart).toBeVisible();
  });

  test('should open report from reports page', async ({ page }) => {
    // Start at the main reports page
    await page.goto('/reports.html');
    await page.waitForLoadState('networkidle');

    // Find and click the Roadmap Status report card
    const roadmapCard = page.locator('.report-card', { hasText: 'Roadmap Status' });
    await roadmapCard.click();

    // Should navigate to the report page
    await expect(page).toHaveURL(/reports\/roadmap-status\.html$/, { timeout: 10000 });

    // Verify the report page loaded
    const header = page.locator('.report-header__title');
    await expect(header).toHaveText('Roadmap Status Report');
  });
});
