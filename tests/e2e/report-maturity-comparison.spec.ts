import { test, expect } from '@playwright/test';

test.describe('Maturity Comparison Report', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should load the maturity comparison report page', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the report page
    await page.goto('/reports/maturity-comparison.html');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that the page title is correct
    await expect(page).toHaveTitle(/Maturity Comparison Report/);

    // Check that the header is visible
    const header = page.locator('.report-header__title');
    await expect(header).toHaveText('Maturity Comparison Report');

    // Check for critical JavaScript errors
    const jsErrors = consoleErrors.filter(err =>
      err.includes('SyntaxError') ||
      err.includes('Uncaught') ||
      err.includes('TypeError')
    );

    expect(jsErrors, `JavaScript errors found: ${jsErrors.join(', ')}`).toHaveLength(0);
  });

  test('should display framework selector with all options', async ({ page }) => {
    await page.goto('/reports/maturity-comparison.html');
    await page.waitForLoadState('networkidle');

    // Check that framework selector is visible
    const frameworkSelector = page.locator('#frameworkSelector');
    await expect(frameworkSelector).toBeVisible();

    // Check all framework buttons are present
    await expect(page.locator('.framework-btn[data-framework="all"]')).toBeVisible();
    await expect(page.locator('.framework-btn[data-framework="spm"]')).toBeVisible();
    await expect(page.locator('.framework-btn[data-framework="tbm"]')).toBeVisible();
    await expect(page.locator('.framework-btn[data-framework="finops"]')).toBeVisible();

    // "All Frameworks" should be active by default
    await expect(page.locator('.framework-btn[data-framework="all"]')).toHaveClass(/active/);
  });

  test('should switch frameworks when clicking framework buttons', async ({ page }) => {
    await page.goto('/reports/maturity-comparison.html');
    await page.waitForLoadState('networkidle');

    // Wait for initial data load
    await page.waitForTimeout(1000);

    // Click on SPM framework
    const spmButton = page.locator('.framework-btn[data-framework="spm"]');
    await spmButton.click();

    // Wait for data reload
    await page.waitForTimeout(500);

    // SPM button should now be active
    await expect(spmButton).toHaveClass(/active/);

    // All Frameworks button should no longer be active
    await expect(page.locator('.framework-btn[data-framework="all"]')).not.toHaveClass(/active/);
  });

  test('should display portfolio stats when data is available', async ({ page }) => {
    await page.goto('/reports/maturity-comparison.html');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(1500);

    // Check if report content is visible (not empty state)
    const reportContent = page.locator('#reportContent');
    const emptyState = page.locator('#emptyState');

    const hasData = await reportContent.isVisible();
    const isEmpty = await emptyState.isVisible();

    // Either content is visible or empty state is shown
    expect(hasData || isEmpty).toBe(true);

    // If we have data, check stats are displayed
    if (hasData) {
      // Stats row should be visible
      const statsRow = page.locator('#statsRow');
      await expect(statsRow).toBeVisible();

      // Total customers stat should show a number
      const totalCustomers = page.locator('#statTotalCustomers');
      await expect(totalCustomers).toBeVisible();
      const totalText = await totalCustomers.textContent();
      expect(totalText).toMatch(/^\d+$/);

      // Average score should be displayed
      const avgScore = page.locator('#statAvgScore');
      await expect(avgScore).toBeVisible();
    }
  });

  test('should display ranking chart when data is available', async ({ page }) => {
    await page.goto('/reports/maturity-comparison.html');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(1500);

    // Check if report content is visible
    const reportContent = page.locator('#reportContent');
    const hasData = await reportContent.isVisible();

    if (hasData) {
      // Ranking chart should be visible
      const rankingChart = page.locator('#rankingChart');
      await expect(rankingChart).toBeVisible();
    }
  });

  test('should display leaders and needs attention sections when data is available', async ({ page }) => {
    await page.goto('/reports/maturity-comparison.html');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(1500);

    // Check if report content is visible
    const reportContent = page.locator('#reportContent');
    const hasData = await reportContent.isVisible();

    if (hasData) {
      // Leaders list should exist
      const leadersList = page.locator('#leadersList');
      await expect(leadersList).toBeVisible();

      // Needs attention list should exist
      const attentionList = page.locator('#attentionList');
      await expect(attentionList).toBeVisible();
    }
  });

  test('should display common gaps section when data is available', async ({ page }) => {
    await page.goto('/reports/maturity-comparison.html');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(1500);

    // Check if report content is visible
    const reportContent = page.locator('#reportContent');
    const hasData = await reportContent.isVisible();

    if (hasData) {
      // Common gaps list should exist
      const gapsList = page.locator('#gapsList');
      await expect(gapsList).toBeVisible();
    }
  });

  test('should display heatmap table when data is available', async ({ page }) => {
    await page.goto('/reports/maturity-comparison.html');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(1500);

    // Check if report content is visible
    const reportContent = page.locator('#reportContent');
    const hasData = await reportContent.isVisible();

    if (hasData) {
      // Heatmap table should exist
      const heatmapTable = page.locator('#heatmapTable');
      await expect(heatmapTable).toBeVisible();

      // Table should have headers
      const headers = heatmapTable.locator('thead th');
      const headerCount = await headers.count();
      expect(headerCount).toBeGreaterThan(0);

      // Customer column should be present
      await expect(headers.first()).toHaveText('Customer');
    }
  });

  test('should navigate back to reports page', async ({ page }) => {
    await page.goto('/reports/maturity-comparison.html');
    await page.waitForLoadState('networkidle');

    // Click the back link
    const backLink = page.locator('.report-header__back');
    await backLink.click();

    // Should navigate to reports page
    await expect(page).toHaveURL(/reports\.html$/);
  });

  test('should open report from reports page', async ({ page }) => {
    // Start at the main reports page
    await page.goto('/reports.html');
    await page.waitForLoadState('networkidle');

    // Find and click the Maturity Comparison report card
    const maturityCard = page.locator('.report-card', { hasText: 'Maturity Comparison' });
    await maturityCard.click();

    // Should navigate to the report page
    await expect(page).toHaveURL(/reports\/maturity-comparison\.html$/);

    // Verify the report page loaded
    const header = page.locator('.report-header__title');
    await expect(header).toHaveText('Maturity Comparison Report');
  });

  test('should have print and export buttons', async ({ page }) => {
    await page.goto('/reports/maturity-comparison.html');
    await page.waitForLoadState('networkidle');

    // Print button should be visible
    const printButton = page.locator('button', { hasText: 'Print' });
    await expect(printButton).toBeVisible();

    // Export button should be visible
    const exportButton = page.locator('button', { hasText: 'Export' });
    await expect(exportButton).toBeVisible();
  });

  test('should filter data when selecting a specific framework', async ({ page }) => {
    await page.goto('/reports/maturity-comparison.html');
    await page.waitForLoadState('networkidle');

    // Wait for initial data load
    await page.waitForTimeout(1500);

    // Click on FinOps framework
    const finopsButton = page.locator('.framework-btn[data-framework="finops"]');
    await finopsButton.click();

    // Wait for loading state to appear and then content
    await page.waitForTimeout(1000);

    // Check if loading state is gone
    const loadingState = page.locator('#loadingState');
    await expect(loadingState).toBeHidden();

    // Either report content or empty state should be visible
    const reportContent = page.locator('#reportContent');
    const emptyState = page.locator('#emptyState');

    const hasContent = await reportContent.isVisible();
    const hasEmpty = await emptyState.isVisible();

    expect(hasContent || hasEmpty).toBe(true);
  });

  test('should show loading state while fetching data', async ({ page }) => {
    // Intercept API call to add delay
    await page.route('**/assessments/comparison/portfolio*', async route => {
      // Add a small delay to observe loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto('/reports/maturity-comparison.html');

    // Loading state should be visible initially
    const loadingState = page.locator('#loadingState');
    await expect(loadingState).toBeVisible();

    // Wait for data to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Loading state should be hidden after data loads
    await expect(loadingState).toBeHidden();
  });

  test('should color-code scores correctly', async ({ page }) => {
    await page.goto('/reports/maturity-comparison.html');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(1500);

    // Check if report content is visible
    const reportContent = page.locator('#reportContent');
    const hasData = await reportContent.isVisible();

    if (hasData) {
      // Check that score elements have appropriate classes
      // Low scores should have score-low class (red)
      // Medium scores should have score-medium class (yellow)
      // High scores should have score-high class (green)

      // Get all score cells in the heatmap
      const scoreCells = page.locator('.heatmap-cell');
      const cellCount = await scoreCells.count();

      // If there are cells, at least one should have a score class
      if (cellCount > 0) {
        const lowScores = page.locator('.heatmap-cell.score-low');
        const mediumScores = page.locator('.heatmap-cell.score-medium');
        const highScores = page.locator('.heatmap-cell.score-high');

        const totalScored =
          (await lowScores.count()) +
          (await mediumScores.count()) +
          (await highScores.count());

        // At least some cells should have score classes
        expect(totalScored).toBeGreaterThan(0);
      }
    }
  });
});
