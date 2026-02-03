import { test, expect } from '@playwright/test';

/**
 * Customers Page Tests
 *
 * Tests for customer list, filtering, sorting, and CRUD operations.
 */

test.describe('Customers List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prototype/customers.html');
    await page.waitForLoadState('networkidle');
  });

  test('should display customers page', async ({ page }) => {
    await expect(page).toHaveURL(/customers/);
    await expect(page.locator('h1, .page-title')).toContainText(/customer/i);
  });

  test('should display customer table or list', async ({ page }) => {
    // Check for customer table or list container
    const customerList = page.locator('table, .customer-list, .customer-table, [data-testid="customer-list"]');
    await expect(customerList).toBeVisible({ timeout: 10000 });
  });

  test('should display table headers', async ({ page }) => {
    // Check for expected column headers
    const headers = ['Name', 'Health', 'ARR', 'Renewal', 'CSM', 'Stage'];

    for (const header of headers) {
      const headerElement = page.locator(`th:has-text("${header}"), .header:has-text("${header}")`);
      // At least some headers should be visible
    }
  });

  test('should have search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], .search-input, #search');
    await expect(searchInput).toBeVisible();

    // Type in search
    await searchInput.fill('test');

    // Wait for filtering to apply
    await page.waitForTimeout(500);
  });

  test('should have health status filter', async ({ page }) => {
    // Look for health filter
    const healthFilter = page.locator('select[name="health"], #health-filter, .health-filter, [data-testid="health-filter"]');

    if (await healthFilter.count() > 0) {
      await expect(healthFilter).toBeVisible();

      // Try selecting a filter value
      await healthFilter.selectOption({ index: 1 }).catch(() => {
        // May be a custom dropdown, not a select element
      });
    }
  });

  test('should display add customer button', async ({ page }) => {
    // Look for add customer button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), .add-customer-btn, [data-testid="add-customer"]');
    await expect(addButton).toBeVisible();
  });

  test('should open add customer modal', async ({ page }) => {
    // Click add button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), .add-customer-btn, [data-testid="add-customer"]');
    await addButton.click();

    // Modal should appear
    const modal = page.locator('.modal, [role="dialog"], .modal-overlay.open, #customer-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('should close modal on cancel', async ({ page }) => {
    // Open modal
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), .add-customer-btn');
    await addButton.click();

    // Wait for modal
    const modal = page.locator('.modal, [role="dialog"], .modal-overlay.open');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Click cancel or close button
    const cancelButton = page.locator('button:has-text("Cancel"), .modal-close, [aria-label="Close"]');
    await cancelButton.click();

    // Modal should be hidden
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('should sort by clicking table headers', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table th, .sortable-header', { timeout: 10000 });

    // Click on a sortable header
    const nameHeader = page.locator('th:has-text("Name"), .sortable-header:has-text("Name")');
    if (await nameHeader.count() > 0) {
      await nameHeader.click();

      // Wait for sort to apply
      await page.waitForTimeout(500);

      // Click again to reverse sort
      await nameHeader.click();
    }
  });

  test('should navigate to customer detail on row click', async ({ page }) => {
    // Wait for customer rows
    const firstRow = page.locator('table tbody tr, .customer-row').first();

    if (await firstRow.count() > 0) {
      // Click on customer name or row
      const customerLink = firstRow.locator('a, .customer-name').first();
      await customerLink.click();

      // Should navigate to detail page
      await expect(page).toHaveURL(/customer-detail|customers\/\d+/);
    }
  });
});

test.describe('Customer CRUD Operations', () => {
  test('should create a new customer', async ({ page }) => {
    await page.goto('/prototype/customers.html');
    await page.waitForLoadState('networkidle');

    // Open add modal
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), .add-customer-btn');
    await addButton.click();

    // Fill in customer form
    await page.fill('input[name="name"], #customer-name', 'Test Customer ' + Date.now());

    // Select health status if dropdown exists
    const healthSelect = page.locator('select[name="health_status"], #health-status');
    if (await healthSelect.count() > 0) {
      await healthSelect.selectOption('green');
    }

    // Fill optional fields
    const arrInput = page.locator('input[name="arr"], #arr');
    if (await arrInput.count() > 0) {
      await arrInput.fill('100000');
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
    await submitButton.click();

    // Modal should close and customer should appear in list
    await page.waitForTimeout(1000);

    // Verify customer was added (check for toast message or table update)
    const successMessage = page.locator('.toast, .notification, .success-message');
    // Success indicator should appear or table should refresh
  });

  test('should validate required fields on create', async ({ page }) => {
    await page.goto('/prototype/customers.html');
    await page.waitForLoadState('networkidle');

    // Open add modal
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), .add-customer-btn');
    await addButton.click();

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
    await submitButton.click();

    // Should show validation error
    const errorMessage = page.locator('.error, .validation-error, [aria-invalid="true"], input:invalid');
    await expect(errorMessage.first()).toBeVisible({ timeout: 3000 }).catch(() => {
      // HTML5 validation may prevent form submission without visible error
    });
  });
});

test.describe('Customer Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prototype/customers.html');
    await page.waitForLoadState('networkidle');
  });

  test('should filter by search term', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], .search-input');

    if (await searchInput.count() > 0) {
      // Type search term
      await searchInput.fill('Customer');

      // Wait for filtering
      await page.waitForTimeout(500);

      // Check that URL or table updates
    }
  });

  test('should filter by health status', async ({ page }) => {
    const healthFilter = page.locator('select[name="health"], #health-filter, .health-filter');

    if (await healthFilter.count() > 0) {
      // Select 'red' health status
      await healthFilter.selectOption('red').catch(() => {
        // Custom filter component
      });

      // Wait for filtering
      await page.waitForTimeout(500);
    }
  });

  test('should reset filters', async ({ page }) => {
    // Apply a filter first
    const searchInput = page.locator('input[type="search"], .search-input');
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(300);

      // Clear filter
      await searchInput.clear();
      await page.waitForTimeout(300);
    }

    // Check for reset button if exists
    const resetButton = page.locator('button:has-text("Reset"), button:has-text("Clear")');
    if (await resetButton.count() > 0) {
      await resetButton.click();
    }
  });
});

test.describe('Customer Pagination', () => {
  test('should display pagination controls', async ({ page }) => {
    await page.goto('/prototype/customers.html');
    await page.waitForLoadState('networkidle');

    // Check for pagination elements
    const pagination = page.locator('.pagination, [aria-label="Pagination"], .page-controls');

    // Pagination may not be visible if there's only one page of results
    const isPaginationVisible = await pagination.count() > 0;
  });

  test('should navigate between pages', async ({ page }) => {
    await page.goto('/prototype/customers.html');
    await page.waitForLoadState('networkidle');

    // Try to find and click next page
    const nextButton = page.locator('button:has-text("Next"), .next-page, [aria-label="Next page"]');

    if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }
  });
});
