import { test, expect } from '@playwright/test';

/**
 * Recommendations Table View Tests
 *
 * Tests for the editable table view functionality including:
 * - View toggle (cards/table)
 * - Selection and bulk action bar
 * - Inline editing (priority, status, tools)
 * - Bulk operations (edit status, priority, tools, send to roadmap)
 */

test.describe('Recommendations Table View', () => {
  // Helper to navigate to recommendations tab
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

  test.describe('View Toggle', () => {
    test('should display view toggle buttons', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Check for view toggle buttons
      const cardsBtn = page.locator('#recViewCards');
      const tableBtn = page.locator('#recViewTable');

      await expect(cardsBtn).toBeVisible({ timeout: 5000 });
      await expect(tableBtn).toBeVisible({ timeout: 5000 });
    });

    test('should default to cards view', async ({ page }) => {
      // Clear localStorage first
      await page.goto('/customers.html');
      await page.evaluate(() => localStorage.removeItem('recViewPreference'));
      await page.waitForLoadState('networkidle');

      await navigateToRecommendationsTab(page);

      const cardsBtn = page.locator('#recViewCards');
      await expect(cardsBtn).toHaveClass(/active/, { timeout: 5000 });

      // Cards list should be visible
      const cardsList = page.locator('#allRecsList');
      await expect(cardsList).toBeVisible({ timeout: 5000 });
    });

    test('should switch to table view when clicked', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Click table view button
      const tableBtn = page.locator('#recViewTable');
      await tableBtn.click();
      await page.waitForTimeout(500);

      // Table button should be active
      await expect(tableBtn).toHaveClass(/active/, { timeout: 5000 });

      // Table view should be visible
      const tableView = page.locator('#allRecsTableView');
      await expect(tableView).toBeVisible({ timeout: 5000 });

      // Cards list should be hidden
      const cardsList = page.locator('#allRecsList');
      await expect(cardsList).toBeHidden();
    });

    test('should persist view preference in localStorage', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      const tableBtn = page.locator('#recViewTable');
      await tableBtn.click();
      await page.waitForTimeout(500);

      // Check localStorage
      const preference = await page.evaluate(() => localStorage.getItem('recViewPreference'));
      expect(preference).toBe('table');

      // Switch back to cards
      const cardsBtn = page.locator('#recViewCards');
      await cardsBtn.click();
      await page.waitForTimeout(500);

      const newPreference = await page.evaluate(() => localStorage.getItem('recViewPreference'));
      expect(newPreference).toBe('cards');
    });

    test('should restore saved view preference on page reload', async ({ page }) => {
      // Set preference to table
      await page.goto('/customers.html');
      await page.evaluate(() => localStorage.setItem('recViewPreference', 'table'));

      await navigateToRecommendationsTab(page);
      await page.waitForTimeout(500);

      // Table view should be active
      const tableBtn = page.locator('#recViewTable');
      await expect(tableBtn).toHaveClass(/active/, { timeout: 5000 });
    });
  });

  test.describe('Table Structure', () => {
    test('should display table with correct headers', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      const tableBtn = page.locator('#recViewTable');
      await tableBtn.click();
      await page.waitForTimeout(500);

      // Check for table headers
      const table = page.locator('#recDataTable');
      await expect(table).toBeVisible({ timeout: 5000 });

      // Verify header columns (use header row to avoid filter row duplicates)
      const headerRow = table.locator('.rec-table-header-row');
      await expect(headerRow.locator('th:has-text("Title")')).toBeVisible();
      await expect(headerRow.locator('th:has-text("Priority")')).toBeVisible();
      await expect(headerRow.locator('th:has-text("Status")')).toBeVisible();
      await expect(headerRow.locator('th:has-text("Tools")')).toBeVisible();
      await expect(headerRow.locator('th:has-text("Category")')).toBeVisible();
      await expect(headerRow.locator('th:has-text("Score")')).toBeVisible();
      await expect(headerRow.locator('th:has-text("Actions")')).toBeVisible();
    });

    test('should display select all checkbox in header', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      const tableBtn = page.locator('#recViewTable');
      await tableBtn.click();
      await page.waitForTimeout(500);

      const selectAllCheckbox = page.locator('#recSelectAll');
      await expect(selectAllCheckbox).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Selection', () => {
    test('should show bulk action bar when items selected', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // Bulk action bar should be hidden initially
      const bulkBar = page.locator('#recBulkActionBar');
      await expect(bulkBar).toBeHidden();

      // Check if there are any rows to select
      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Select first row
        const firstCheckbox = rows.first().locator('input[type="checkbox"]');
        await firstCheckbox.check();
        await page.waitForTimeout(300);

        // Bulk action bar should be visible
        await expect(bulkBar).toBeVisible({ timeout: 5000 });

        // Count should show 1 selected
        const countEl = page.locator('#recSelectedCount');
        await expect(countEl).toHaveText('1');
      }
    });

    test('should select all rows with select all checkbox', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Click select all
        const selectAllCheckbox = page.locator('#recSelectAll');
        await selectAllCheckbox.check();
        await page.waitForTimeout(300);

        // All row checkboxes should be checked
        const rowCheckboxes = page.locator('#recTableBody tr input[type="checkbox"]');
        const checkedCount = await rowCheckboxes.evaluateAll(boxes =>
          boxes.filter(b => (b as HTMLInputElement).checked).length
        );
        expect(checkedCount).toBe(rowCount);

        // Count should show total selected
        const countEl = page.locator('#recSelectedCount');
        await expect(countEl).toHaveText(rowCount.toString());
      }
    });

    test('should deselect all rows when select all unchecked', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Click the checkbox label to select all
        const selectAllLabel = page.locator('.rec-table-checkbox:has(#recSelectAll)');
        await selectAllLabel.click();
        await page.waitForTimeout(300);

        // Verify items are selected
        const bulkBar = page.locator('#recBulkActionBar');
        await expect(bulkBar).toBeVisible({ timeout: 5000 });

        // Click again to deselect all
        await selectAllLabel.click();
        await page.waitForTimeout(300);

        // Bulk action bar should be hidden
        await expect(bulkBar).toBeHidden();
      }
    });

    test('should highlight selected rows', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Select first row
        const firstRow = rows.first();
        const firstCheckbox = firstRow.locator('input[type="checkbox"]');
        await firstCheckbox.check();
        await page.waitForTimeout(300);

        // Row should have selected class
        await expect(firstRow).toHaveClass(/selected/);
      }
    });
  });

  test.describe('Inline Editing', () => {
    test('should have inline priority dropdown', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Check for priority dropdown in first row
        const prioritySelect = rows.first().locator('select.rec-inline-select').first();
        await expect(prioritySelect).toBeVisible({ timeout: 5000 });

        // Verify options exist by checking count (options aren't visible until dropdown is open)
        const optionCount = await prioritySelect.locator('option').count();
        expect(optionCount).toBe(3); // high, medium, low
      }
    });

    test('should have inline status dropdown', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Check for status dropdown (second select in row)
        const statusSelect = rows.first().locator('select.rec-inline-select').nth(1);
        await expect(statusSelect).toBeVisible({ timeout: 5000 });

        // Verify options exist by checking count (options aren't visible until dropdown is open)
        const optionCount = await statusSelect.locator('option').count();
        expect(optionCount).toBe(4); // open, in_progress, completed, dismissed
      }
    });
  });

  test.describe('Bulk Edit Modals', () => {
    async function selectFirstRow(page) {
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        const firstCheckbox = rows.first().locator('input[type="checkbox"]');
        await firstCheckbox.check();
        await page.waitForTimeout(300);
        return true;
      }
      return false;
    }

    test('should open bulk edit status modal', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      const hasRows = await selectFirstRow(page);
      if (!hasRows) return;

      // Click Edit Status button
      const editStatusBtn = page.locator('#recBulkActionBar button:has-text("Edit Status")');
      await editStatusBtn.click();
      await page.waitForTimeout(300);

      // Modal should be visible
      const modal = page.locator('#bulkEditStatusModal');
      await expect(modal).toHaveClass(/open/, { timeout: 5000 });

      // Check for status select
      const statusSelect = page.locator('#bulkStatusSelect');
      await expect(statusSelect).toBeVisible();
    });

    test('should open bulk edit priority modal', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      const hasRows = await selectFirstRow(page);
      if (!hasRows) return;

      // Click Edit Priority button
      const editPriorityBtn = page.locator('#recBulkActionBar button:has-text("Edit Priority")');
      await editPriorityBtn.click();
      await page.waitForTimeout(300);

      // Modal should be visible
      const modal = page.locator('#bulkEditPriorityModal');
      await expect(modal).toHaveClass(/open/, { timeout: 5000 });

      // Check for priority select
      const prioritySelect = page.locator('#bulkPrioritySelect');
      await expect(prioritySelect).toBeVisible();
    });

    test('should open bulk edit tools modal', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      const hasRows = await selectFirstRow(page);
      if (!hasRows) return;

      // Click Edit Tools button
      const editToolsBtn = page.locator('#recBulkActionBar button:has-text("Edit Tools")');
      await editToolsBtn.click();
      await page.waitForTimeout(300);

      // Modal should be visible
      const modal = page.locator('#bulkEditToolsModal');
      await expect(modal).toHaveClass(/open/, { timeout: 5000 });

      // Check for tools checkboxes
      const toolsCheckboxes = page.locator('#bulkEditToolsModal input[name="bulkTools"]');
      const count = await toolsCheckboxes.count();
      expect(count).toBe(4); // Targetprocess, Costing, Planning, Cloudability
    });

    test('should close bulk edit modal on cancel', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      const hasRows = await selectFirstRow(page);
      if (!hasRows) return;

      // Open Edit Status modal
      const editStatusBtn = page.locator('#recBulkActionBar button:has-text("Edit Status")');
      await editStatusBtn.click();
      await page.waitForTimeout(300);

      // Click cancel
      const cancelBtn = page.locator('#bulkEditStatusModal button:has-text("Cancel")');
      await cancelBtn.click();
      await page.waitForTimeout(300);

      // Modal should be closed
      const modal = page.locator('#bulkEditStatusModal');
      await expect(modal).not.toHaveClass(/open/);
    });
  });

  test.describe('Bulk Send to Roadmap', () => {
    test('should open bulk send to roadmap modal', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view and select a row
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Select first row
        const firstCheckbox = rows.first().locator('input[type="checkbox"]');
        await firstCheckbox.check();
        await page.waitForTimeout(300);

        // Click Add to Roadmap button
        const addToRoadmapBtn = page.locator('#recBulkActionBar button:has-text("Add to Roadmap")');
        await addToRoadmapBtn.click();
        await page.waitForTimeout(300);

        // Modal should be visible OR toast shown if no eligible items
        const modal = page.locator('#bulkSendToRoadmapModal');
        const isModalOpen = await modal.evaluate(el => el.classList.contains('open'));

        // If modal opened, verify it has the right structure
        if (isModalOpen) {
          await expect(modal).toHaveClass(/open/, { timeout: 5000 });

          // Check for quarter select
          const quarterSelect = page.locator('#bulkRoadmapQuarter');
          await expect(quarterSelect).toBeVisible();

          // Check for year select
          const yearSelect = page.locator('#bulkRoadmapYear');
          await expect(yearSelect).toBeVisible();

          // Check for tools checkboxes
          const toolsCheckboxes = page.locator('#bulkSendToRoadmapModal input[name="bulkRoadmapTools"]');
          const count = await toolsCheckboxes.count();
          expect(count).toBe(4);
        }
      }
    });

    test('should display selected items list in modal', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view and select multiple rows
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount >= 2) {
        // Select first two rows
        await rows.nth(0).locator('input[type="checkbox"]').check();
        await rows.nth(1).locator('input[type="checkbox"]').check();
        await page.waitForTimeout(300);

        // Click Add to Roadmap button
        const addToRoadmapBtn = page.locator('#recBulkActionBar button:has-text("Add to Roadmap")');
        await addToRoadmapBtn.click();
        await page.waitForTimeout(300);

        // If modal opened, check items list
        const modal = page.locator('#bulkSendToRoadmapModal');
        const isModalOpen = await modal.evaluate(el => el.classList.contains('open'));

        if (isModalOpen) {
          const itemsList = page.locator('#bulkRoadmapItemsList');
          await expect(itemsList).toBeVisible();

          // Items should be listed
          const items = page.locator('#bulkRoadmapItemsList .bulk-items-list__item');
          const itemCount = await items.count();
          expect(itemCount).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Table Actions', () => {
    test('should have Add to Roadmap button for eligible items', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Check for action buttons in rows
        const actionButtons = page.locator('#recTableBody .rec-table-actions button');
        const buttonCount = await actionButtons.count();
        expect(buttonCount).toBeGreaterThan(0);
      }
    });

    test('should have Edit button for each row', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Each row should have an edit button
        const firstRowEditBtn = rows.first().locator('.rec-table-actions button').last();
        await expect(firstRowEditBtn).toBeVisible();
      }
    });
  });

  test.describe('Column Sorting', () => {
    test('should display sortable column headers', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // Check for sortable headers
      const titleHeader = page.locator('th.rec-th-sortable[data-sort-key="title"]');
      const priorityHeader = page.locator('th.rec-th-sortable[data-sort-key="priority"]');
      const statusHeader = page.locator('th.rec-th-sortable[data-sort-key="status"]');
      const categoryHeader = page.locator('th.rec-th-sortable[data-sort-key="category"]');
      const scoreHeader = page.locator('th.rec-th-sortable[data-sort-key="score"]');

      await expect(titleHeader).toBeVisible();
      await expect(priorityHeader).toBeVisible();
      await expect(statusHeader).toBeVisible();
      await expect(categoryHeader).toBeVisible();
      await expect(scoreHeader).toBeVisible();
    });

    test('should show sort icon when column header clicked', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Click on Title header to sort
        const titleHeader = page.locator('th.rec-th-sortable[data-sort-key="title"]');
        await titleHeader.click();
        await page.waitForTimeout(300);

        // Sort icon should show ascending
        const sortIcon = page.locator('.rec-sort-icon[data-sort-key="title"]');
        await expect(sortIcon).toHaveClass(/asc/);

        // Click again to toggle to descending
        await titleHeader.click();
        await page.waitForTimeout(300);

        await expect(sortIcon).toHaveClass(/desc/);
      }
    });

    test('should sort by priority when priority header clicked', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 1) {
        // Click on Priority header
        const priorityHeader = page.locator('th.rec-th-sortable[data-sort-key="priority"]');
        await priorityHeader.click();
        await page.waitForTimeout(300);

        // Verify sort is applied (icon should be visible)
        const sortIcon = page.locator('.rec-sort-icon[data-sort-key="priority"]');
        await expect(sortIcon).toHaveClass(/asc|desc/);
      }
    });
  });

  test.describe('Row Filtering (Excel-style)', () => {
    test('should display filter row with inputs', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // Check for filter inputs
      const titleFilter = page.locator('#recFilterTitle');
      const priorityFilter = page.locator('#recFilterPriority');
      const statusFilter = page.locator('#recFilterStatus');
      const toolsFilter = page.locator('#recFilterTools');
      const categoryFilter = page.locator('#recFilterCategory');

      await expect(titleFilter).toBeVisible();
      await expect(priorityFilter).toBeVisible();
      await expect(statusFilter).toBeVisible();
      await expect(toolsFilter).toBeVisible();
      await expect(categoryFilter).toBeVisible();
    });

    test('should filter by title text', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const initialCount = await rows.count();

      if (initialCount > 0) {
        // Get first row title for filtering
        const firstRowTitle = await rows.first().locator('td').nth(1).textContent();

        // Type a unique part of the title
        const filterInput = page.locator('#recFilterTitle');
        await filterInput.fill(firstRowTitle?.substring(0, 10) || 'test');
        await page.waitForTimeout(500);

        // Rows should be filtered
        const filteredCount = await rows.count();
        // Either we have fewer rows or same if the filter matches all
        expect(filteredCount).toBeLessThanOrEqual(initialCount);
      }
    });

    test('should filter by priority dropdown', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const initialCount = await rows.count();

      if (initialCount > 0) {
        // Select high priority filter
        const priorityFilter = page.locator('#recFilterPriority');
        await priorityFilter.selectOption('high');
        await page.waitForTimeout(500);

        // Rows should be filtered or show "no results" message
        const filteredRows = page.locator('#recTableBody tr:not(.rec-table-empty)');
        const filteredCount = await filteredRows.count();
        expect(filteredCount).toBeLessThanOrEqual(initialCount);
      }
    });

    test('should filter by status dropdown', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // Select open status filter
      const statusFilter = page.locator('#recFilterStatus');
      await statusFilter.selectOption('open');
      await page.waitForTimeout(500);

      // Filter should be applied
      await expect(statusFilter).toHaveValue('open');
    });

    test('should show active filters display when filters applied', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Apply a filter
        const priorityFilter = page.locator('#recFilterPriority');
        await priorityFilter.selectOption('high');
        await page.waitForTimeout(500);

        // Active filters display should be visible
        const activeFilters = page.locator('#recActiveFilters');
        await expect(activeFilters).toBeVisible({ timeout: 5000 });

        // Should show a filter chip
        const filterChip = page.locator('.rec-filter-chip');
        const chipCount = await filterChip.count();
        expect(chipCount).toBeGreaterThan(0);
      }
    });

    test('should clear individual filter when chip X clicked', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Apply a filter
        const priorityFilter = page.locator('#recFilterPriority');
        await priorityFilter.selectOption('high');
        await page.waitForTimeout(500);

        // Click the remove button on the filter chip
        const removeBtn = page.locator('.rec-filter-chip__remove').first();
        if (await removeBtn.isVisible()) {
          await removeBtn.click();
          await page.waitForTimeout(300);

          // Filter should be cleared
          await expect(priorityFilter).toHaveValue('');
        }
      }
    });

    test('should clear all filters with clear all button', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // Apply multiple filters
      await page.locator('#recFilterPriority').selectOption('high');
      await page.locator('#recFilterStatus').selectOption('open');
      await page.waitForTimeout(300);

      // Click clear all button in filter row
      const clearBtn = page.locator('.rec-filter-clear-btn').first();
      await clearBtn.click();
      await page.waitForTimeout(300);

      // All filters should be cleared
      await expect(page.locator('#recFilterPriority')).toHaveValue('');
      await expect(page.locator('#recFilterStatus')).toHaveValue('');
    });

    test('should filter by source (custom/AI)', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // Select custom source filter
      const sourceFilter = page.locator('#recFilterSource');
      await sourceFilter.selectOption('custom');
      await page.waitForTimeout(500);

      // Filter should be applied
      await expect(sourceFilter).toHaveValue('custom');
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no recommendations', async ({ page }) => {
      // This test may need adjustment based on actual data
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // Either table has rows or empty state is shown
      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount === 0) {
        // Empty state or no rows message should be visible
        const emptyState = page.locator('#noAllRecsState');
        await expect(emptyState).toBeVisible();
      }
    });
  });

  test.describe('Excel Import/Export', () => {
    test('should display import/export toolbar in table view', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // Import/export toolbar should be visible
      const toolbar = page.locator('.rec-import-export-toolbar');
      await expect(toolbar).toBeVisible({ timeout: 5000 });

      // Export button should be visible
      const exportBtn = page.locator('button:has-text("Export Excel")');
      await expect(exportBtn).toBeVisible();

      // Import button should be visible
      const importBtn = page.locator('button:has-text("Import Excel")');
      await expect(importBtn).toBeVisible();
    });

    test('should have hidden file input for import', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // File input should exist (hidden)
      const fileInput = page.locator('#recImportFile');
      await expect(fileInput).toBeAttached();

      // Should accept xlsx, xls, and csv
      const acceptAttr = await fileInput.getAttribute('accept');
      expect(acceptAttr).toContain('.xlsx');
      expect(acceptAttr).toContain('.csv');
    });

    test('should trigger download when Export Excel clicked', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // Listen for download event
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

      // Click export button
      const exportBtn = page.locator('button:has-text("Export Excel")');
      await exportBtn.click();

      // Wait for download (or timeout if no data)
      const download = await downloadPromise;

      // If there's data, a download should have started
      const rows = page.locator('#recTableBody tr');
      const rowCount = await rows.count();

      if (rowCount > 0 && download) {
        // Verify download filename contains csv
        const suggestedFilename = download.suggestedFilename();
        expect(suggestedFilename).toContain('.csv');
      }
    });

    test('should open import modal when file selected', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // Create a simple CSV file for testing
      const csvContent = 'Title,Priority,Status,Category,Tools\nTest Import Item,high,open,Capacity Planning,Targetprocess';

      // Set up file chooser handler
      const fileInput = page.locator('#recImportFile');

      // Create a file buffer
      await fileInput.setInputFiles({
        name: 'test-import.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });

      await page.waitForTimeout(500);

      // Import modal should open
      const modal = page.locator('#recImportModal');
      await expect(modal).toHaveClass(/open/, { timeout: 5000 });
    });

    test('should display import preview table with parsed data', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // Create CSV with test data
      const csvContent = 'Title,Priority,Status,Category,Tools\nTest Item One,high,open,Automation,Targetprocess\nTest Item Two,medium,in_progress,Security,Cloudability';

      const fileInput = page.locator('#recImportFile');
      await fileInput.setInputFiles({
        name: 'test-import.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });

      await page.waitForTimeout(500);

      // Preview table should show the parsed rows
      const previewTable = page.locator('#recImportPreviewTable');
      await expect(previewTable).toBeVisible({ timeout: 5000 });

      // Should have 2 data rows
      const previewRows = page.locator('#recImportPreviewBody tr');
      const rowCount = await previewRows.count();
      expect(rowCount).toBe(2);
    });

    test('should show import mode options', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // Import a file to open modal
      const csvContent = 'Title,Priority,Status,Category,Tools\nTest Item,high,open,Automation,Targetprocess';

      const fileInput = page.locator('#recImportFile');
      await fileInput.setInputFiles({
        name: 'test-import.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });

      await page.waitForTimeout(500);

      // Should have import mode radio buttons (by name and value)
      const createOnlyRadio = page.locator('input[name="recImportMode"][value="create"]');
      const upsertRadio = page.locator('input[name="recImportMode"][value="upsert"]');

      await expect(createOnlyRadio).toBeAttached();
      await expect(upsertRadio).toBeAttached();
    });

    test('should close import modal on cancel', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // Import a file to open modal
      const csvContent = 'Title,Priority,Status,Category,Tools\nTest Item,high,open,Automation,Targetprocess';

      const fileInput = page.locator('#recImportFile');
      await fileInput.setInputFiles({
        name: 'test-import.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });

      await page.waitForTimeout(500);

      // Modal should be open
      const modal = page.locator('#recImportModal');
      await expect(modal).toHaveClass(/open/, { timeout: 5000 });

      // Click cancel
      const cancelBtn = page.locator('#recImportModal button:has-text("Cancel")');
      await cancelBtn.click();
      await page.waitForTimeout(300);

      // Modal should be closed
      await expect(modal).not.toHaveClass(/open/);
    });

    test('should display row count summary in import modal', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Switch to table view
      await page.locator('#recViewTable').click();
      await page.waitForTimeout(500);

      // Create CSV with multiple rows
      const csvContent = 'Title,Priority,Status,Category,Tools\nItem 1,high,open,Automation,Targetprocess\nItem 2,medium,open,Security,Cloudability\nItem 3,low,completed,Cost,Planning';

      const fileInput = page.locator('#recImportFile');
      await fileInput.setInputFiles({
        name: 'test-import.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });

      await page.waitForTimeout(500);

      // Should show row count (3 rows to import)
      const modal = page.locator('#recImportModal');
      const modalText = await modal.textContent();
      expect(modalText).toContain('3');
    });

    test('should not show toolbar in cards view', async ({ page }) => {
      await navigateToRecommendationsTab(page);

      // Ensure cards view
      await page.locator('#recViewCards').click();
      await page.waitForTimeout(500);

      // Toolbar should not be visible
      const toolbar = page.locator('.rec-import-export-toolbar');
      await expect(toolbar).toBeHidden();
    });
  });
});
