import { test, expect } from '@playwright/test';

/**
 * Assessment Builder E2E Tests
 *
 * Tests for the card-based template editor page.
 */

test.use({ storageState: 'tests/e2e/.auth/user.json' });

// Run tests sequentially since they share state (clone -> edit -> promote -> cleanup)
test.describe.configure({ mode: 'serial' });

// Worker-specific version string to isolate parallel test workers
let E2E_VERSION = '99.0-e2e';

// Helper: select SPM framework and wait for templates
async function selectSPM(page) {
  await page.goto('/assessment-builder.html');
  await page.waitForLoadState('networkidle');

  const spmTab = page.locator('.builder-toolbar__frameworks .btn[data-type="spm"]');
  await expect(spmTab).toBeVisible({ timeout: 10000 });
  await spmTab.click();
  await page.waitForTimeout(1500);
}

// Helper: select this worker's draft template from dropdown
async function selectDraft(page): Promise<boolean> {
  const versionSelect = page.locator('#versionSelect');
  const options = versionSelect.locator('option');
  const optionCount = await options.count();
  for (let i = 0; i < optionCount; i++) {
    const text = await options.nth(i).textContent();
    if (text && text.includes(E2E_VERSION) && text.includes('draft')) {
      const val = await options.nth(i).getAttribute('value');
      if (val) {
        await versionSelect.selectOption(val);
        await page.waitForTimeout(1500);
        return true;
      }
    }
  }
  return false;
}

test.describe('Assessment Builder', () => {

  test('page loads with 3 framework tabs', async ({ page }) => {
    await page.goto('/assessment-builder.html');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.header__title')).toHaveText('Assessment Builder');

    const frameworkTabs = page.locator('.builder-toolbar__frameworks .btn');
    await expect(frameworkTabs).toHaveCount(3, { timeout: 10000 });

    const tabTexts = await frameworkTabs.allTextContents();
    expect(tabTexts).toContain('SPM');
    expect(tabTexts).toContain('TBM');
    expect(tabTexts).toContain('FinOps');
  });

  test('selecting framework shows template versions', async ({ page }) => {
    await selectSPM(page);

    const versionSelect = page.locator('#versionSelect');
    const options = versionSelect.locator('option');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1);

    const spmTab = page.locator('.builder-toolbar__frameworks .btn[data-type="spm"]');
    await expect(spmTab).toHaveClass(/active/);
  });

  test('template shows dimension tabs and question cards', async ({ page }) => {
    await selectSPM(page);

    await expect(page.locator('#templateMeta')).toBeVisible();

    const dimensionTabs = page.locator('.builder-dimension-tab');
    const dimCount = await dimensionTabs.count();
    expect(dimCount).toBeGreaterThan(1);

    // Cards should render instead of table rows
    const questionCards = page.locator('.builder-card[data-question-id]');
    const cardCount = await questionCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('card shows rubric completeness badge', async ({ page }) => {
    await selectSPM(page);

    const badge = page.locator('.builder-card__badge').first();
    await expect(badge).toBeVisible();

    // Should show "Required" or "Rubric: X/Y complete"
    const allBadges = page.locator('.builder-card__badge');
    const count = await allBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('expanding card shows inline rubric table', async ({ page }) => {
    await selectSPM(page);

    // Click the toggle button on the first card (force to avoid header interception on mobile)
    const toggle = page.locator('.builder-card__toggle').first();
    await toggle.click({ force: true });
    await page.waitForTimeout(500);

    // The card should now be expanded with a rubric table
    const rubricTable = page.locator('.builder-rubric-table').first();
    await expect(rubricTable).toBeVisible();

    // Rubric should have score rows
    const rubricRows = rubricTable.locator('tbody tr');
    const rowCount = await rubricRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(4);
  });

  test('inline rubric cell editing works', async ({ page }) => {
    await selectSPM(page);

    // Expand first card (force to avoid header interception on mobile)
    const toggle = page.locator('.builder-card__toggle').first();
    await toggle.click({ force: true });
    await page.waitForTimeout(500);

    // Click a rubric cell to edit
    const rubricCell = page.locator('.builder-rubric-cell').first();
    await rubricCell.click();
    await page.waitForTimeout(300);

    // Should show an input or textarea
    const inputField = page.locator('.builder-rubric-cell input, .builder-rubric-cell textarea').first();
    await expect(inputField).toBeVisible({ timeout: 3000 });

    // Press Escape to cancel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('clone as draft opens modal with version picker', async ({ page }, testInfo) => {
    // Use project-specific version to isolate parallel workers
    E2E_VERSION = `99.0-e2e-${testInfo.project.name}`;

    await selectSPM(page);

    const cloneBtn = page.locator('#btnClone');
    await expect(cloneBtn).toBeEnabled();
    await cloneBtn.click({ force: true });

    // New draft modal should appear
    const modal = page.locator('#newDraftModal');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Should have version input and source dropdown
    await expect(page.locator('#draftVersion')).toBeVisible();
    await expect(page.locator('#draftSourceSelect')).toBeVisible();

    // Source dropdown should have options
    const sourceOptions = page.locator('#draftSourceSelect option');
    const optCount = await sourceOptions.count();
    expect(optCount).toBeGreaterThan(0);

    // Fill in version and create
    await page.fill('#draftVersion', E2E_VERSION);

    // Auto-accept alert dialog
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await page.locator('#newDraftModal .btn--primary').click({ force: true });
    await page.waitForTimeout(3000);

    const statusTag = page.locator('.builder-status-tag--draft');
    await expect(statusTag).toBeVisible({ timeout: 5000 });

    await expect(page.locator('#btnPromote')).toBeVisible();
  });

  test('inline edit question text on draft card', async ({ page }) => {
    await selectSPM(page);
    const found = await selectDraft(page);
    if (!found) { test.skip(); return; }

    // Click question text on a card to edit
    const questionText = page.locator('.builder-card__text').first();
    await expect(questionText).toBeVisible();
    await questionText.click();

    const textarea = page.locator('.builder-card__text .builder-inline-textarea, .builder-inline-textarea');
    await expect(textarea).toBeVisible({ timeout: 3000 });

    await textarea.fill('E2E Test - Updated question text');
    await textarea.blur();
    await page.waitForTimeout(1500);

    const saveText = await page.locator('#saveStatusText').textContent();
    expect(saveText).toMatch(/saved|Saving/i);
  });

  test('add and delete question on draft', async ({ page }) => {
    // Auto-accept ALL dialogs (confirm, alert, prompt) for this test
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await selectSPM(page);
    const found = await selectDraft(page);
    if (!found) { test.skip(); return; }

    // Select a specific dimension
    const dimTab = page.locator('.builder-dimension-tab').nth(1);
    await dimTab.click();
    await page.waitForTimeout(500);

    const initialCardCount = await page.locator('.builder-card[data-question-id]').count();

    // Add question
    const addBtn = page.locator('#btnAddQuestion');
    await expect(addBtn).toBeVisible();

    const addResponsePromise = page.waitForResponse(
      resp => resp.url().includes('/questions') && resp.request().method() === 'POST'
    );
    await addBtn.click({ force: true });
    await addResponsePromise;
    await page.waitForTimeout(2000);

    const newCardCount = await page.locator('.builder-card[data-question-id]').count();
    expect(newCardCount).toBeGreaterThan(initialCardCount);

    // Dismiss any active inline editing
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Get the last card (newly added) and its question ID
    const lastCard = page.locator('.builder-card[data-question-id]').last();
    await lastCard.scrollIntoViewIfNeeded();
    const qId = await lastCard.getAttribute('data-question-id');

    // Ensure the card is expanded to reveal the delete button
    const isExpanded = await lastCard.evaluate(el => el.classList.contains('builder-card--expanded'));
    if (!isExpanded) {
      const lastToggle = lastCard.locator('.builder-card__toggle');
      await lastToggle.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Click delete and wait for DELETE API response
    const deleteBtn = lastCard.locator('.builder-card__footer button');

    const deleteResponsePromise = page.waitForResponse(
      resp => resp.url().includes(`/questions/${qId}`) && resp.request().method() === 'DELETE'
    );
    await deleteBtn.click({ force: true });
    await deleteResponsePromise;

    // Wait for the specific card to disappear (robust against parallel workers)
    await expect(page.locator(`.builder-card[data-question-id="${qId}"]`)).toHaveCount(0, { timeout: 8000 });
  });

  test('promote draft to active', async ({ page }) => {
    await selectSPM(page);
    const found = await selectDraft(page);
    if (!found) { test.skip(); return; }

    // Get the template ID from the page state
    const templateId = await page.evaluate(() => {
      // @ts-ignore
      const select = document.getElementById('versionSelect');
      return select ? select.value : null;
    });

    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    const promoteResult = await page.evaluate(async (id) => {
      try {
        const resp = await fetch(`/api/v1/assessments/templates/${id}/promote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        return { ok: resp.ok, status: resp.status, text: await resp.text() };
      } catch (e: any) {
        return { ok: false, status: 0, text: e.message };
      }
    }, templateId);

    expect(promoteResult, `Promote failed: ${promoteResult.status} - ${promoteResult.text}`).toHaveProperty('ok', true);

    // Now reload the template in the UI
    await page.evaluate(async () => {
      // @ts-ignore
      await window.AB.selectTemplate(document.getElementById('versionSelect').value);
    });

    await page.waitForTimeout(1000);

    // The status tag should show active
    const statusTag = page.locator('.builder-status-tag--active');
    await expect(statusTag).toBeVisible({ timeout: 10000 });
  });

  test('active template shows warning on edit', async ({ page }) => {
    await selectSPM(page);

    // Should be on active template after previous test
    const statusTag = page.locator('.builder-status-tag--active');
    await expect(statusTag).toBeVisible({ timeout: 5000 });

    // Warning should be hidden initially
    const warning = page.locator('#activeEditWarning');
    await expect(warning).toBeHidden();

    // Click a question number to trigger inline edit
    const questionNum = page.locator('.builder-card__number').first();
    await questionNum.click();
    await page.waitForTimeout(500);

    // Warning should now be visible
    await expect(warning).toBeVisible();

    // Cancel the edit
    await page.keyboard.press('Escape');
  });

  test('view audit trail', async ({ page }) => {
    await selectSPM(page);

    const historyBtn = page.locator('#btnHistory');
    await expect(historyBtn).toBeEnabled();
    await historyBtn.click({ force: true });

    const auditModal = page.locator('#auditModal');
    await expect(auditModal).toBeVisible({ timeout: 3000 });

    await page.locator('#auditModal .builder-modal__close').click({ force: true });
    await expect(auditModal).toBeHidden();
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/assessment-builder.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('net::ERR') &&
      !e.includes('Failed to load resource')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  // Cleanup: restore original active template and remove test templates
  test('cleanup - restore original active template', async ({ request }) => {
    const response = await request.get('/api/v1/assessments/templates?type=spm');
    const data = await response.json();

    for (const template of data.items) {
      if (template.version && template.version.startsWith('99.0-e2e')) {
        if (template.is_active) {
          const original = data.items.find((t: any) => !t.version?.startsWith('99.0-e2e') && t.assessment_type_id === template.assessment_type_id);
          if (original) {
            await request.post(`/api/v1/assessments/templates/${original.id}/activate`);
          }
        }
        await request.delete(`/api/v1/assessments/templates/${template.id}`);
      }
    }
  });
});
