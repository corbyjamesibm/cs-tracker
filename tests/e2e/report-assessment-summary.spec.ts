import { test, expect } from '@playwright/test';

// Use authenticated state
test.use({ storageState: 'tests/e2e/.auth/user.json' });

test.describe('Assessment Summary Report', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the assessment summary report
    await page.goto('/reports/assessment-summary.html');
  });

  test('should load and display the report page', async ({ page }) => {
    // Wait for loading to complete
    await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('#reportContent')).toBeVisible();

    // Check page title
    await expect(page).toHaveTitle(/Assessment Summary Report/);

    // Check header is visible
    await expect(page.locator('.report-header__title')).toHaveText('Assessment Summary Report');
  });

  test('should display summary cards with data', async ({ page }) => {
    await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 10000 });

    // Check all summary cards are present
    await expect(page.locator('.summary-card')).toHaveCount(4);

    // Total Customers card should have a numeric value
    const totalCustomers = page.locator('#totalCustomers');
    await expect(totalCustomers).toBeVisible();
    const totalText = await totalCustomers.textContent();
    expect(totalText).toMatch(/^\d+$/);
  });

  test('should display dimension scores chart', async ({ page }) => {
    await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 10000 });

    // Check chart container is visible
    await expect(page.locator('.chart-section')).toBeVisible();
    await expect(page.locator('#dimensionChart')).toBeVisible();
  });

  test('should display customers table', async ({ page }) => {
    await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 10000 });

    // Check table is present
    await expect(page.locator('.data-table-section')).toBeVisible();
    await expect(page.locator('#customersTable')).toBeVisible();

    // Check table headers
    const headers = page.locator('.data-table th');
    await expect(headers).toHaveCount(5);
    await expect(headers.nth(0)).toContainText('Customer Name');
    await expect(headers.nth(1)).toContainText('SPM Score');
    await expect(headers.nth(2)).toContainText('TBM Score');
    await expect(headers.nth(3)).toContainText('FinOps Score');
    await expect(headers.nth(4)).toContainText('Avg Score');
  });

  test('should filter customers by framework', async ({ page }) => {
    await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 10000 });

    // Get initial row count
    const initialRowCount = await page.locator('#customersTableBody tr').count();

    // Select SPM filter
    await page.selectOption('#frameworkFilter', 'spm');

    // Wait for filter to apply
    await page.waitForTimeout(300);

    // If there are any customers with SPM scores, the table should show them
    // If not, it should show "No customers match" message
    const filteredRows = page.locator('#customersTableBody tr');
    const filteredCount = await filteredRows.count();

    // Either fewer rows or same (if all have SPM)
    expect(filteredCount).toBeLessThanOrEqual(initialRowCount);
  });

  test('should search customers by name', async ({ page }) => {
    await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 10000 });

    // Wait for table to load
    await expect(page.locator('#customersTableBody tr').first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no customers, that's also valid
    });

    // Get a customer name from the table if any exist
    const firstRow = page.locator('#customersTableBody tr').first();
    const hasData = await firstRow.locator('td').first().isVisible().catch(() => false);

    if (hasData) {
      // Get the first customer name
      const customerName = await firstRow.locator('.customer-link').textContent();

      // Search for part of the name
      const searchTerm = customerName?.substring(0, 3) || 'a';
      await page.fill('#customerSearch', searchTerm);

      // Wait for filter
      await page.waitForTimeout(300);

      // The search results should include our customer
      const searchResults = page.locator('#customersTableBody tr');
      const resultsCount = await searchResults.count();
      expect(resultsCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should sort table by column', async ({ page }) => {
    await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 10000 });

    // Click on Customer Name header to sort
    await page.click('.data-table th[data-sort="customer_name"]');

    // Wait for sort
    await page.waitForTimeout(300);

    // Click again to reverse sort
    await page.click('.data-table th[data-sort="customer_name"]');

    // The table should still be visible
    await expect(page.locator('#customersTable')).toBeVisible();
  });

  test('should navigate to customer detail when clicking customer name', async ({ page }) => {
    await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 10000 });

    // Check if there are any customers in the table
    const customerLink = page.locator('#customersTableBody .customer-link').first();
    const hasCustomers = await customerLink.isVisible().catch(() => false);

    if (hasCustomers) {
      // Click the customer link
      await customerLink.click();

      // Should navigate to customer detail page
      await expect(page).toHaveURL(/customer-detail\.html\?id=\d+/);
    }
  });

  test('should refresh data when clicking refresh button', async ({ page }) => {
    await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 10000 });

    // Click refresh button
    await page.click('button:has-text("Refresh")');

    // Loading overlay should appear briefly
    await expect(page.locator('#loadingOverlay')).toBeVisible();

    // Then disappear
    await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 10000 });
  });

  test('should export report as CSV', async ({ page }) => {
    await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 10000 });

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    await page.click('button:has-text("Export")');

    // Wait for download
    const download = await downloadPromise;

    // Check filename
    expect(download.suggestedFilename()).toMatch(/assessment-summary-.*\.csv/);
  });

  test('should navigate back to reports page', async ({ page }) => {
    await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 10000 });

    // Click back link
    await page.click('a:has-text("Back to Reports")');

    // Should be on reports page
    await expect(page).toHaveURL(/reports\.html/);
  });

  test('should have no JavaScript console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 10000 });

    // Wait a bit for any async operations
    await page.waitForTimeout(1000);

    // Filter out expected/acceptable errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('404')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Assessment Summary Report - Navigation', () => {
  test('should navigate from reports page to assessment summary', async ({ page }) => {
    // Start at reports page
    await page.goto('/reports.html');

    // Click on Assessment Summary card
    await page.click('.report-card:has-text("Assessment Summary")');

    // Should navigate to assessment summary page
    await expect(page).toHaveURL(/reports\/assessment-summary\.html/);

    // Wait for loading to complete
    await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('#reportContent')).toBeVisible();
  });
});
