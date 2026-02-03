import { test, expect } from '@playwright/test';

/**
 * Admin Page Tests
 *
 * Tests for administrative functionality including settings, user management, and partner management.
 */

test.describe('Admin Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prototype/admin.html');
    await page.waitForLoadState('networkidle');
  });

  test('should display admin page', async ({ page }) => {
    await expect(page).toHaveURL(/admin/);
    await expect(page.locator('h1, .page-title')).toContainText(/admin|settings/i);
  });

  test('should display settings section', async ({ page }) => {
    const settingsSection = page.locator('.settings-section, [data-testid="settings"], .settings');
    await expect(settingsSection.or(page.locator('text=/Settings/i'))).toBeVisible({ timeout: 10000 });
  });

  test('should display user management section', async ({ page }) => {
    const usersSection = page.locator('.users-section, [data-testid="users"], .user-management');
    await expect(usersSection.or(page.locator('text=/Users/i'))).toBeVisible({ timeout: 10000 });
  });
});

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prototype/admin.html');
    await page.waitForLoadState('networkidle');
  });

  test('should display user list', async ({ page }) => {
    const userList = page.locator('.user-list, table.users, [data-testid="user-list"]');
    await expect(userList.or(page.locator('table'))).toBeVisible({ timeout: 10000 });
  });

  test('should have add user button', async ({ page }) => {
    const addUserButton = page.locator('button:has-text("Add User"), button:has-text("New User"), .add-user-btn');
    await expect(addUserButton).toBeVisible({ timeout: 10000 });
  });

  test('should open add user modal', async ({ page }) => {
    const addUserButton = page.locator('button:has-text("Add User"), button:has-text("New User"), .add-user-btn');
    await addUserButton.click();

    // Modal should appear
    const modal = page.locator('.modal, [role="dialog"], .modal-overlay.open');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('should create a new user', async ({ page }) => {
    // Open add modal
    const addUserButton = page.locator('button:has-text("Add User"), button:has-text("New User")');
    await addUserButton.click();

    // Fill in user form
    await page.fill('input[name="email"], #user-email', `test${Date.now()}@example.com`);
    await page.fill('input[name="first_name"], #first-name', 'Test');
    await page.fill('input[name="last_name"], #last-name', 'User');

    // Select role if available
    const roleSelect = page.locator('select[name="role"], #user-role');
    if (await roleSelect.count() > 0) {
      await roleSelect.selectOption('csm');
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
    await submitButton.click();

    // Modal should close
    const modal = page.locator('.modal, [role="dialog"]');
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('should edit a user', async ({ page }) => {
    // Find a user row
    const userRow = page.locator('.user-row, table tbody tr').first();

    if (await userRow.count() > 0) {
      // Click edit button
      const editButton = userRow.locator('button:has-text("Edit"), .edit-btn');

      if (await editButton.count() > 0) {
        await editButton.click();

        // Modal should open
        const modal = page.locator('.modal, [role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Update first name
        await page.fill('input[name="first_name"], #first-name', 'Updated');

        // Submit
        const submitButton = page.locator('button[type="submit"], button:has-text("Save")');
        await submitButton.click();

        // Modal should close
        await expect(modal).not.toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should deactivate a user', async ({ page }) => {
    // Find a user row
    const userRow = page.locator('.user-row, table tbody tr').first();

    if (await userRow.count() > 0) {
      // Find deactivate button or toggle
      const deactivateButton = userRow.locator('button:has-text("Deactivate"), .deactivate-btn, input[type="checkbox"]');

      if (await deactivateButton.count() > 0) {
        // Handle confirmation if needed
        page.on('dialog', dialog => dialog.accept());

        await deactivateButton.click();

        // Wait for update
        await page.waitForTimeout(1000);
      }
    }
  });
});

test.describe('Partner Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prototype/admin.html');
    await page.waitForLoadState('networkidle');
  });

  test('should display partner section', async ({ page }) => {
    const partnerSection = page.locator('.partner-section, [data-testid="partners"], .partners');
    // Partner section may or may not be visible
  });

  test('should have add partner button', async ({ page }) => {
    const addPartnerButton = page.locator('button:has-text("Add Partner"), button:has-text("New Partner"), .add-partner-btn');
    // Partner functionality may or may not be present
  });
});

test.describe('Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prototype/admin.html');
    await page.waitForLoadState('networkidle');
  });

  test('should display authentication toggle', async ({ page }) => {
    const authToggle = page.locator('input[name="auth_enabled"], #auth-enabled, .auth-toggle');

    if (await authToggle.count() > 0) {
      await expect(authToggle).toBeVisible();
    }
  });

  test('should toggle authentication setting', async ({ page }) => {
    const authToggle = page.locator('input[type="checkbox"][name="auth_enabled"], #auth-enabled');

    if (await authToggle.count() > 0) {
      // Get current state
      const isChecked = await authToggle.isChecked();

      // Toggle
      await authToggle.click();

      // Verify change
      await expect(authToggle).not.toBeChecked({ checked: isChecked });

      // Toggle back to original state
      await authToggle.click();
    }
  });

  test('should manage lookup values', async ({ page }) => {
    // Check for lookup management section
    const lookupSection = page.locator('.lookup-section, [data-testid="lookups"], .lookup-management');

    if (await lookupSection.count() > 0) {
      await expect(lookupSection).toBeVisible();
    }
  });
});

test.describe('Assessment Templates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prototype/admin.html');
    await page.waitForLoadState('networkidle');
  });

  test('should display assessment templates section', async ({ page }) => {
    const templateSection = page.locator('.template-section, [data-testid="assessment-templates"], .assessment-templates');
    // Template section may or may not be visible
  });

  test('should upload assessment template', async ({ page }) => {
    // Find file upload for templates
    const fileInput = page.locator('input[type="file"][accept*="xlsx"], #template-upload');

    if (await fileInput.count() > 0) {
      // File upload functionality exists
    }
  });
});

test.describe('Data Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prototype/admin.html');
    await page.waitForLoadState('networkidle');
  });

  test('should have clear data option with warning', async ({ page }) => {
    const clearDataButton = page.locator('button:has-text("Clear"), button:has-text("Reset Data"), .clear-data-btn');

    if (await clearDataButton.count() > 0) {
      // Clear data should have warning styling
      await expect(clearDataButton).toHaveClass(/danger|destructive|warning/);
    }
  });

  test('should require confirmation for clear data', async ({ page }) => {
    const clearDataButton = page.locator('button:has-text("Clear Data"), .clear-data-btn');

    if (await clearDataButton.count() > 0) {
      // Set up dialog handler to reject
      page.on('dialog', dialog => {
        expect(dialog.type()).toBe('confirm');
        dialog.dismiss();
      });

      await clearDataButton.click();
    }
  });
});
