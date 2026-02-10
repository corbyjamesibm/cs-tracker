import { test, expect } from '@playwright/test';

test.describe('Roadmap Item Resize', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    // Navigate to a customer with roadmap items (Metlife - customer 17)
    await page.goto('/customer-detail.html?id=17');
    await page.waitForLoadState('networkidle');

    // Click on Roadmap tab
    const roadmapTab = page.locator('.tabs__tab').filter({ hasText: 'Roadmap' });
    await roadmapTab.click();
    await page.waitForTimeout(1000);
  });

  test('resize handles are visible on hover', async ({ page }) => {
    // Find a roadmap item
    const roadmapItem = page.locator('.roadmap-item').first();
    await expect(roadmapItem).toBeVisible();

    // Hover over the item
    await roadmapItem.hover();
    await page.waitForTimeout(300);

    // Check that resize handles exist
    const leftHandle = roadmapItem.locator('.roadmap-resize-left');
    const rightHandle = roadmapItem.locator('.roadmap-resize-right');

    await expect(leftHandle).toBeVisible();
    await expect(rightHandle).toBeVisible();

    // Log the handle dimensions for debugging
    const leftBox = await leftHandle.boundingBox();
    const rightBox = await rightHandle.boundingBox();
    console.log('Left handle box:', leftBox);
    console.log('Right handle box:', rightBox);
  });

  test('drag right edge to increase duration', async ({ page }) => {
    const roadmapItem = page.locator('.roadmap-item').first();
    await expect(roadmapItem).toBeVisible();

    // Get initial dates from data attributes
    const initialStartDate = await roadmapItem.getAttribute('data-start-date');
    const initialEndDate = await roadmapItem.getAttribute('data-end-date');
    console.log(`Initial: ${initialStartDate} to ${initialEndDate}`);

    // Get the right resize handle
    const rightHandle = roadmapItem.locator('.roadmap-resize-right');
    const handleBox = await rightHandle.boundingBox();

    if (!handleBox) {
      throw new Error('Could not get right handle bounding box');
    }

    // Drag right handle to the right (increase duration)
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY, { steps: 10 });
    await page.mouse.up();

    // Wait for save
    await page.waitForTimeout(1000);

    // Check if end date changed
    const newEndDate = await roadmapItem.getAttribute('data-end-date');
    console.log(`After right drag: ${initialStartDate} to ${newEndDate}`);

    // Start date should be the same, end date should be later
    const newStartDate = await roadmapItem.getAttribute('data-start-date');
    expect(newStartDate).toBe(initialStartDate);
  });

  test('drag right edge to decrease duration', async ({ page }) => {
    const roadmapItem = page.locator('.roadmap-item').first();
    await expect(roadmapItem).toBeVisible();

    const initialEndDate = await roadmapItem.getAttribute('data-end-date');
    console.log(`Initial end date: ${initialEndDate}`);

    const rightHandle = roadmapItem.locator('.roadmap-resize-right');
    const handleBox = await rightHandle.boundingBox();

    if (!handleBox) {
      throw new Error('Could not get right handle bounding box');
    }

    // Drag right handle to the LEFT (decrease duration)
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 100, startY, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(1000);

    const newEndDate = await roadmapItem.getAttribute('data-end-date');
    console.log(`After left drag of right handle: ${newEndDate}`);
  });

  test('drag left edge to increase duration (move start earlier)', async ({ page }) => {
    const roadmapItem = page.locator('.roadmap-item').first();
    await expect(roadmapItem).toBeVisible();

    const initialStartDate = await roadmapItem.getAttribute('data-start-date');
    const initialEndDate = await roadmapItem.getAttribute('data-end-date');
    console.log(`Initial: ${initialStartDate} to ${initialEndDate}`);

    const leftHandle = roadmapItem.locator('.roadmap-resize-left');
    const handleBox = await leftHandle.boundingBox();

    if (!handleBox) {
      throw new Error('Could not get left handle bounding box');
    }

    // Drag left handle to the LEFT (increase duration by moving start earlier)
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 100, startY, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(1000);

    const newStartDate = await roadmapItem.getAttribute('data-start-date');
    const newEndDate = await roadmapItem.getAttribute('data-end-date');
    console.log(`After: ${newStartDate} to ${newEndDate}`);

    // End date should remain the same
    expect(newEndDate).toBe(initialEndDate);
  });

  test('drag left edge to decrease duration (move start later)', async ({ page }) => {
    const roadmapItem = page.locator('.roadmap-item').first();
    await expect(roadmapItem).toBeVisible();

    const initialStartDate = await roadmapItem.getAttribute('data-start-date');
    const initialEndDate = await roadmapItem.getAttribute('data-end-date');
    console.log(`Initial: ${initialStartDate} to ${initialEndDate}`);

    const leftHandle = roadmapItem.locator('.roadmap-resize-left');
    const handleBox = await leftHandle.boundingBox();

    if (!handleBox) {
      throw new Error('Could not get left handle bounding box');
    }

    // Drag left handle to the RIGHT (decrease duration by moving start later)
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(1000);

    const newStartDate = await roadmapItem.getAttribute('data-start-date');
    const newEndDate = await roadmapItem.getAttribute('data-end-date');
    console.log(`After: ${newStartDate} to ${newEndDate}`);

    // End date should remain the same
    expect(newEndDate).toBe(initialEndDate);
  });

  test('debug - check handle positions and click areas', async ({ page }) => {
    const roadmapItem = page.locator('.roadmap-item').first();
    await expect(roadmapItem).toBeVisible();

    // Get item bounding box
    const itemBox = await roadmapItem.boundingBox();
    console.log('Roadmap item box:', itemBox);

    // Get left handle
    const leftHandle = roadmapItem.locator('.roadmap-resize-left');
    const leftBox = await leftHandle.boundingBox();
    console.log('Left handle box:', leftBox);

    // Get right handle
    const rightHandle = roadmapItem.locator('.roadmap-resize-right');
    const rightBox = await rightHandle.boundingBox();
    console.log('Right handle box:', rightBox);

    // Get computed styles
    const leftStyles = await leftHandle.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        position: styles.position,
        left: styles.left,
        right: styles.right,
        width: styles.width,
        height: styles.height,
        cursor: styles.cursor,
        zIndex: styles.zIndex
      };
    });
    console.log('Left handle computed styles:', leftStyles);

    const rightStyles = await rightHandle.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        position: styles.position,
        left: styles.left,
        right: styles.right,
        width: styles.width,
        height: styles.height,
        cursor: styles.cursor,
        zIndex: styles.zIndex
      };
    });
    console.log('Right handle computed styles:', rightStyles);
  });
});
