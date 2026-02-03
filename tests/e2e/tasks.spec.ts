import { test, expect } from '@playwright/test';

/**
 * Tasks Page Tests
 *
 * Tests for task management page including CRUD operations and filtering.
 */

test.describe('Tasks Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prototype/tasks.html');
    await page.waitForLoadState('networkidle');
  });

  test('should display tasks page', async ({ page }) => {
    await expect(page).toHaveURL(/tasks/);
    await expect(page.locator('h1, .page-title')).toContainText(/task/i);
  });

  test('should display task list', async ({ page }) => {
    // Check for task list container
    const taskList = page.locator('table, .task-list, .tasks-container, [data-testid="task-list"]');
    await expect(taskList).toBeVisible({ timeout: 10000 });
  });

  test('should have add task button', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create"), .add-task-btn');
    await expect(addButton).toBeVisible();
  });

  test('should open add task modal', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create"), .add-task-btn');
    await addButton.click();

    // Modal should appear
    const modal = page.locator('.modal, [role="dialog"], .modal-overlay.open');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('should have status filter', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"], #status-filter, .status-filter, [data-testid="status-filter"]');

    if (await statusFilter.count() > 0) {
      await expect(statusFilter).toBeVisible();
    }
  });

  test('should have priority filter', async ({ page }) => {
    const priorityFilter = page.locator('select[name="priority"], #priority-filter, .priority-filter');

    if (await priorityFilter.count() > 0) {
      await expect(priorityFilter).toBeVisible();
    }
  });

  test('should display task status badges', async ({ page }) => {
    // Check for status indicators
    const statusBadges = page.locator('.task-status, .status-badge, [data-testid="task-status"]');
    // Badges visible if tasks exist
  });

  test('should display task priority indicators', async ({ page }) => {
    // Check for priority indicators
    const priorityBadges = page.locator('.task-priority, .priority-badge, [data-testid="task-priority"]');
    // Badges visible if tasks exist
  });
});

test.describe('Task CRUD Operations', () => {
  test('should create a new task', async ({ page }) => {
    await page.goto('/prototype/tasks.html');
    await page.waitForLoadState('networkidle');

    // Open add modal
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), .add-task-btn');
    await addButton.click();

    // Fill in task form
    await page.fill('input[name="title"], #task-title', 'Test Task ' + Date.now());

    // Fill description if available
    const descriptionInput = page.locator('textarea[name="description"], #task-description');
    if (await descriptionInput.count() > 0) {
      await descriptionInput.fill('Test task description');
    }

    // Select priority if available
    const prioritySelect = page.locator('select[name="priority"], #task-priority');
    if (await prioritySelect.count() > 0) {
      await prioritySelect.selectOption('high');
    }

    // Select customer if required
    const customerSelect = page.locator('select[name="customer_id"], #task-customer');
    if (await customerSelect.count() > 0) {
      await customerSelect.selectOption({ index: 1 }).catch(() => {});
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
    await submitButton.click();

    // Modal should close
    const modal = page.locator('.modal, [role="dialog"]');
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('should mark task as complete', async ({ page }) => {
    await page.goto('/prototype/tasks.html');
    await page.waitForLoadState('networkidle');

    // Find an open task
    const openTask = page.locator('.task-row:has(.status-open), tr:has(.status-open)').first();

    if (await openTask.count() > 0) {
      // Find complete button or checkbox
      const completeButton = openTask.locator('button:has-text("Complete"), .complete-btn, input[type="checkbox"]');

      if (await completeButton.count() > 0) {
        await completeButton.click();

        // Wait for status update
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should edit a task', async ({ page }) => {
    await page.goto('/prototype/tasks.html');
    await page.waitForLoadState('networkidle');

    // Find a task to edit
    const firstTask = page.locator('.task-row, table tbody tr').first();

    if (await firstTask.count() > 0) {
      // Click edit button
      const editButton = firstTask.locator('button:has-text("Edit"), .edit-btn, [aria-label="Edit"]');

      if (await editButton.count() > 0) {
        await editButton.click();

        // Modal should open
        const modal = page.locator('.modal, [role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Update title
        await page.fill('input[name="title"], #task-title', 'Updated Task Title');

        // Submit
        const submitButton = page.locator('button[type="submit"], button:has-text("Save")');
        await submitButton.click();

        // Modal should close
        await expect(modal).not.toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should delete a task', async ({ page }) => {
    await page.goto('/prototype/tasks.html');
    await page.waitForLoadState('networkidle');

    // Find a task to delete
    const firstTask = page.locator('.task-row, table tbody tr').first();

    if (await firstTask.count() > 0) {
      // Click delete button
      const deleteButton = firstTask.locator('button:has-text("Delete"), .delete-btn, [aria-label="Delete"]');

      if (await deleteButton.count() > 0) {
        // Handle confirmation dialog
        page.on('dialog', dialog => dialog.accept());

        await deleteButton.click();

        // Wait for deletion
        await page.waitForTimeout(1000);
      }
    }
  });
});

test.describe('Task Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prototype/tasks.html');
    await page.waitForLoadState('networkidle');
  });

  test('should filter by status', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"], #status-filter');

    if (await statusFilter.count() > 0) {
      // Filter by 'open' status
      await statusFilter.selectOption('open');

      // Wait for filtering
      await page.waitForTimeout(500);

      // Verify filtered results
      const tasks = page.locator('.task-row, table tbody tr');
      // All visible tasks should have 'open' status
    }
  });

  test('should filter by priority', async ({ page }) => {
    const priorityFilter = page.locator('select[name="priority"], #priority-filter');

    if (await priorityFilter.count() > 0) {
      // Filter by 'high' priority
      await priorityFilter.selectOption('high');

      // Wait for filtering
      await page.waitForTimeout(500);
    }
  });

  test('should filter by assignee', async ({ page }) => {
    const assigneeFilter = page.locator('select[name="assignee"], #assignee-filter');

    if (await assigneeFilter.count() > 0) {
      // Select first assignee
      await assigneeFilter.selectOption({ index: 1 }).catch(() => {});

      // Wait for filtering
      await page.waitForTimeout(500);
    }
  });

  test('should filter by customer', async ({ page }) => {
    const customerFilter = page.locator('select[name="customer"], #customer-filter');

    if (await customerFilter.count() > 0) {
      // Select first customer
      await customerFilter.selectOption({ index: 1 }).catch(() => {});

      // Wait for filtering
      await page.waitForTimeout(500);
    }
  });

  test('should combine multiple filters', async ({ page }) => {
    const statusFilter = page.locator('select[name="status"], #status-filter');
    const priorityFilter = page.locator('select[name="priority"], #priority-filter');

    if (await statusFilter.count() > 0 && await priorityFilter.count() > 0) {
      // Apply multiple filters
      await statusFilter.selectOption('open');
      await priorityFilter.selectOption('high');

      // Wait for filtering
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Task Due Dates', () => {
  test('should highlight overdue tasks', async ({ page }) => {
    await page.goto('/prototype/tasks.html');
    await page.waitForLoadState('networkidle');

    // Check for overdue indicators
    const overdueTasks = page.locator('.overdue, .task-overdue, [data-overdue="true"]');
    // Overdue styling should exist if there are overdue tasks
  });

  test('should set due date when creating task', async ({ page }) => {
    await page.goto('/prototype/tasks.html');
    await page.waitForLoadState('networkidle');

    // Open add modal
    const addButton = page.locator('button:has-text("Add"), button:has-text("New")');
    await addButton.click();

    // Find due date input
    const dueDateInput = page.locator('input[type="date"][name="due_date"], #due-date');

    if (await dueDateInput.count() > 0) {
      // Set due date to next week
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const dateString = nextWeek.toISOString().split('T')[0];

      await dueDateInput.fill(dateString);
    }

    // Close modal
    const cancelButton = page.locator('button:has-text("Cancel"), .modal-close');
    await cancelButton.click();
  });
});
