import { test, expect } from '@playwright/test';

test.describe('Dependency Delete', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should delete a dependency when clicking the delete button', async ({ page }) => {
    // Navigate to customer with roadmap dependencies (Metlife - customer 17)
    await page.goto('/customer-detail.html?id=17');
    await page.waitForLoadState('networkidle');

    // Click on the Roadmap tab
    const roadmapTab = page.locator('.tabs__tab').filter({ hasText: 'Roadmap' });
    await roadmapTab.click();
    await page.waitForTimeout(1000);

    // Check if there are any dependency lines
    const dependencyLines = page.locator('.dependency-line-group');
    const initialLineCount = await dependencyLines.count();

    if (initialLineCount === 0) {
      test.skip();
      return;
    }

    // Click on the dependency line using JavaScript to trigger the click handler
    // (needed because the line may be partially covered by cards)
    const firstLine = dependencyLines.first();
    await firstLine.evaluate((el) => {
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      el.dispatchEvent(event);
    });
    await page.waitForTimeout(500);

    // Verify popover appears
    const popover = page.locator('#dependencyPopover');
    await expect(popover).toBeVisible({ timeout: 2000 });

    // Verify delete button is visible
    const deleteBtn = page.locator('#deleteDependencyBtn');
    await expect(deleteBtn).toBeVisible();

    // Click the delete button
    await deleteBtn.click();
    await page.waitForTimeout(1000);

    // Verify the dependency line is gone
    const remainingLines = await dependencyLines.count();
    expect(remainingLines).toBe(initialLineCount - 1);

    // Verify popover is closed
    await expect(popover).not.toBeVisible();
  });

  test('should show dependency popover with correct information', async ({ page }) => {
    await page.goto('/customer-detail.html?id=17');
    await page.waitForLoadState('networkidle');

    // Click on the Roadmap tab
    const roadmapTab = page.locator('.tabs__tab').filter({ hasText: 'Roadmap' });
    await roadmapTab.click();
    await page.waitForTimeout(1000);

    const dependencyLines = page.locator('.dependency-line-group');
    const lineCount = await dependencyLines.count();

    if (lineCount === 0) {
      test.skip();
      return;
    }

    // Click on the dependency line
    const firstLine = dependencyLines.first();
    await firstLine.evaluate((el) => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
    await page.waitForTimeout(500);

    // Verify popover structure
    const popover = page.locator('#dependencyPopover');
    await expect(popover).toBeVisible();

    // Check Item and Depends On labels are present
    await expect(popover.locator('.dependency-popover__label').filter({ hasText: 'Item' })).toBeVisible();
    await expect(popover.locator('.dependency-popover__label').filter({ hasText: 'Depends On' })).toBeVisible();

    // Check delete button is present
    await expect(popover.locator('#deleteDependencyBtn')).toBeVisible();

    // Check close button works
    await popover.locator('.dependency-popover__close').click();
    await expect(popover).not.toBeVisible();
  });
});
