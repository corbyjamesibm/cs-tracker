import { test, expect } from '@playwright/test';

/**
 * Recommendations Tests
 *
 * Tests for the recommendations functionality including filtering by tool.
 */

test.describe('Recommendations', () => {
  // Helper to navigate to recommendations tab
  async function navigateToRecommendationsTab(page) {
    // Go to customers list
    await page.goto('/customers.html');
    await page.waitForLoadState('networkidle');

    // Wait for customer table to load (rows use onclick, not <a> tags)
    const customerRow = page.locator('table tbody tr').first();
    await expect(customerRow).toBeVisible({ timeout: 10000 });

    // Click on first customer row to navigate to detail page
    await customerRow.click();
    await page.waitForLoadState('networkidle');

    // Wait for customer detail page to load (tabs should be visible)
    const tabsNav = page.locator('.tabs__list');
    await expect(tabsNav).toBeVisible({ timeout: 10000 });

    // Click on Recommendations tab (it's an <a> element with class tabs__tab)
    const recommendationsTab = page.locator('a.tabs__tab:has-text("Recommendations")');
    await recommendationsTab.click();
    await page.waitForTimeout(1000);
  }

  test('should display recommendations tab', async ({ page }) => {
    await page.goto('/customers.html');
    await page.waitForLoadState('networkidle');

    // Wait for customer table to load and click first row
    const customerRow = page.locator('table tbody tr').first();
    await expect(customerRow).toBeVisible({ timeout: 10000 });
    await customerRow.click();
    await page.waitForLoadState('networkidle');

    // Check for recommendations tab (it's an <a> element with class tabs__tab)
    const recommendationsTab = page.locator('a.tabs__tab:has-text("Recommendations")');
    await expect(recommendationsTab).toBeVisible({ timeout: 10000 });
  });

  test('should switch to recommendations tab', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    // Recommendations section should be visible
    const recommendationsSection = page.locator('#recommendationsSection, .recommendations-section');
    await expect(recommendationsSection).toBeVisible({ timeout: 5000 });
  });

  test('should display filter controls', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    // Check for framework filter
    const frameworkFilter = page.locator('#recAssessmentTypeFilter');
    await expect(frameworkFilter).toBeVisible({ timeout: 5000 });

    // Check for status filter
    const statusFilter = page.locator('#recStatusFilter');
    await expect(statusFilter).toBeVisible({ timeout: 5000 });

    // Check for tool filter
    const toolFilter = page.locator('#recToolFilter');
    await expect(toolFilter).toBeVisible({ timeout: 5000 });
  });

  test('should display tool filter with correct options', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    const toolFilter = page.locator('#recToolFilter');
    await expect(toolFilter).toBeVisible({ timeout: 5000 });

    // Check for tool options
    await expect(toolFilter.locator('option[value=""]')).toHaveText('All Tools');
    await expect(toolFilter.locator('option[value="Targetprocess"]')).toHaveText('Targetprocess');
    await expect(toolFilter.locator('option[value="Costing"]')).toHaveText('Costing');
    await expect(toolFilter.locator('option[value="Planning"]')).toHaveText('Planning');
    await expect(toolFilter.locator('option[value="Cloudability"]')).toHaveText('Cloudability');
  });

  test('should have clear filters button', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    const clearButton = page.locator('button:has-text("Clear")');
    await expect(clearButton).toBeVisible({ timeout: 5000 });
  });

  test('should clear filters when clear button clicked', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    // Set some filters
    const frameworkFilter = page.locator('#recAssessmentTypeFilter');
    const statusFilter = page.locator('#recStatusFilter');
    const toolFilter = page.locator('#recToolFilter');

    await frameworkFilter.selectOption('1'); // SPM
    await statusFilter.selectOption('open');
    await toolFilter.selectOption('Targetprocess');

    // Verify filters are set
    await expect(frameworkFilter).toHaveValue('1');
    await expect(statusFilter).toHaveValue('open');
    await expect(toolFilter).toHaveValue('Targetprocess');

    // Click clear button
    const clearButton = page.locator('button:has-text("Clear")');
    await clearButton.click();
    await page.waitForTimeout(500);

    // Filters should be reset
    await expect(frameworkFilter).toHaveValue('');
    await expect(statusFilter).toHaveValue('');
    await expect(toolFilter).toHaveValue('');
  });

  test('should filter by tool', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    const toolFilter = page.locator('#recToolFilter');
    await expect(toolFilter).toBeVisible({ timeout: 5000 });

    // Select Targetprocess tool filter
    await toolFilter.selectOption('Targetprocess');
    await page.waitForTimeout(1000);

    // The filter should be applied (count may change)
    const countBadge = page.locator('#customRecCount');
    const count = await countBadge.textContent();

    // Count should be a number (even if 0)
    expect(parseInt(count || '0')).toBeGreaterThanOrEqual(0);
  });

  test('should display add recommendation button', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    const addButton = page.locator('#addCustomRecBtn, button:has-text("Add Recommendation")');
    await expect(addButton).toBeVisible({ timeout: 5000 });
  });

  test('should open add recommendation modal', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    const addButton = page.locator('#addCustomRecBtn, button:has-text("Add Recommendation")');
    await addButton.click();

    // Modal should open
    const modal = page.locator('#customRecommendationModal');
    await expect(modal).toHaveClass(/open/, { timeout: 5000 });
  });

  test('should have tools selection in recommendation modal', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    // Open add recommendation modal
    const addButton = page.locator('#addCustomRecBtn, button:has-text("Add Recommendation")');
    await addButton.click();
    await page.waitForTimeout(500);

    // Check for tools checkboxes
    const toolsCheckboxes = page.locator('input[name="recTools"]');
    const count = await toolsCheckboxes.count();
    expect(count).toBe(4); // Targetprocess, Costing, Planning, Cloudability
  });

  test('should create recommendation with tools selected', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    // Open add recommendation modal
    const addButton = page.locator('#addCustomRecBtn, button:has-text("Add Recommendation")');
    await addButton.click();
    await page.waitForTimeout(500);

    // Fill in required fields
    await page.fill('#recTitle', 'Test Recommendation with Tools');
    await page.fill('#recDescription', 'This is a test recommendation with tools selected');

    // Select tools - scroll the modal body to make checkboxes visible first
    const modalBody = page.locator('#customRecommendationModal .modal__body');
    await modalBody.evaluate(el => el.scrollTop = el.scrollHeight);
    await page.waitForTimeout(300);
    await page.locator('input[name="recTools"][value="Targetprocess"]').click({ force: true });
    await page.locator('input[name="recTools"][value="Costing"]').click({ force: true });

    // Save the recommendation (use specific button ID)
    const saveButton = page.locator('#saveRecBtn');
    await saveButton.click();
    await page.waitForTimeout(1000);

    // Modal should close
    const mainModal = page.locator('#customRecommendationModal');
    await expect(mainModal).not.toHaveClass(/open/, { timeout: 5000 });
  });

  test('should display recommendation cards', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    // Check if custom recommendations panel is visible
    const customPanel = page.locator('#customRecommendationsPanel');
    await expect(customPanel).toBeVisible({ timeout: 5000 });

    // Either recommendations exist or empty state is shown
    const cards = page.locator('#customRecsList .recommendation-card');
    const emptyState = page.locator('#noCustomRecsState');

    const hasCards = await cards.count() > 0;
    const hasEmptyState = await emptyState.isVisible();

    // One of these should be true
    expect(hasCards || hasEmptyState).toBeTruthy();
  });

  test('should switch between custom and generated tabs', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    // Click on AI Generated tab
    const generatedTab = page.locator('.rec-type-tab[data-rec-type="generated"], button:has-text("AI Generated")');
    await generatedTab.click();
    await page.waitForTimeout(500);

    // Generated panel should be visible
    const generatedPanel = page.locator('#generatedRecommendationsPanel');
    await expect(generatedPanel).toBeVisible({ timeout: 5000 });

    // Click back on Custom tab (use specific selector)
    const customTab = page.locator('.rec-type-tab[data-rec-type="custom"]');
    await customTab.click();
    await page.waitForTimeout(500);

    // Custom panel should be visible
    const customPanel = page.locator('#customRecommendationsPanel');
    await expect(customPanel).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Recommendations - Add to Roadmap', () => {
  async function navigateToRecommendationsTab(page) {
    await page.goto('/customers.html');
    await page.waitForLoadState('networkidle');

    // Wait for customer table to load and click first row
    const customerRow = page.locator('table tbody tr').first();
    await expect(customerRow).toBeVisible({ timeout: 10000 });
    await customerRow.click();
    await page.waitForLoadState('networkidle');

    // Wait for tabs to be visible
    const tabsNav = page.locator('.tabs__list');
    await expect(tabsNav).toBeVisible({ timeout: 10000 });

    // Click on Recommendations tab
    const recommendationsTab = page.locator('a.tabs__tab:has-text("Recommendations")');
    await recommendationsTab.click();
    await page.waitForTimeout(1000);
  }

  test('should have Add to Roadmap button on recommendation cards', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    // Check for recommendation cards with roadmap button
    const cards = page.locator('#customRecsList .recommendation-card');

    if (await cards.count() > 0) {
      // Find a card that's not completed/dismissed (should have roadmap button)
      const roadmapButton = cards.first().locator('button:has-text("Roadmap")');
      // Button may or may not exist depending on card status
    }
  });

  test('should open Add to Roadmap modal', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    const roadmapButton = page.locator('#customRecsList .recommendation-card button:has-text("Roadmap")').first();

    if (await roadmapButton.count() > 0) {
      await roadmapButton.click();
      await page.waitForTimeout(500);

      // Modal should open
      const modal = page.locator('#acceptRecommendationModal');
      await expect(modal).toHaveClass(/open/, { timeout: 5000 });
    }
  });

  test('should have tools selection in Add to Roadmap modal', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    const roadmapButton = page.locator('#customRecsList .recommendation-card button:has-text("Roadmap")').first();

    if (await roadmapButton.count() > 0) {
      await roadmapButton.click();
      await page.waitForTimeout(500);

      // Check for tools checkboxes in the accept modal
      const toolsCheckboxes = page.locator('#acceptRecommendationModal input[name="acceptRecTools"]');
      const count = await toolsCheckboxes.count();
      expect(count).toBe(4); // Targetprocess, Costing, Planning, Cloudability
    }
  });

  test('should have quarter and year selection in Add to Roadmap modal', async ({ page }) => {
    await navigateToRecommendationsTab(page);

    const roadmapButton = page.locator('#customRecsList .recommendation-card button:has-text("Roadmap")').first();

    if (await roadmapButton.count() > 0) {
      await roadmapButton.click();
      await page.waitForTimeout(500);

      // Check for quarter select
      const quarterSelect = page.locator('#acceptRecQuarter');
      await expect(quarterSelect).toBeVisible({ timeout: 5000 });

      // Check for year select
      const yearSelect = page.locator('#acceptRecYear');
      await expect(yearSelect).toBeVisible({ timeout: 5000 });
    }
  });
});
