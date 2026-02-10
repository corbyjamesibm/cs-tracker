import { test, expect } from '@playwright/test';

test.describe('Fillable PDF Export/Import', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  async function navigateToAssessmentReport(page) {
    // Navigate directly to customer detail page for Metlife (has completed assessments)
    await page.goto('/customer-detail.html?id=17');
    await page.waitForLoadState('networkidle');

    // Wait for tabs to load
    const tabsNav = page.locator('.tabs__list');
    await expect(tabsNav).toBeVisible({ timeout: 10000 });

    // Click the Assessments tab using force to avoid intercept issues
    const assessmentsTab = page.locator('a.tabs__tab:has-text("Assessments")');
    await assessmentsTab.click({ force: true });
    await page.waitForTimeout(1500);

    // Find a Report button in the assessments table and click it
    const reportBtn = page.locator('button:has-text("Report")').first();
    await expect(reportBtn).toBeVisible({ timeout: 10000 });
    await reportBtn.click();
    await page.waitForTimeout(1500);

    // Verify report modal opened
    const reportModal = page.locator('#assessmentReportModal');
    await expect(reportModal).toBeVisible({ timeout: 5000 });
  }

  test('assessment report modal shows Fillable PDF button', async ({ page }) => {
    await navigateToAssessmentReport(page);

    const fillablePdfBtn = page.locator('button:has-text("Fillable PDF")');
    await expect(fillablePdfBtn).toBeVisible();
  });

  test('assessment report modal shows Import PDF button', async ({ page }) => {
    await navigateToAssessmentReport(page);

    const importPdfBtn = page.locator('button:has-text("Import PDF")');
    await expect(importPdfBtn).toBeVisible();
  });

  test('Fillable PDF export triggers download', async ({ page, context }) => {
    await navigateToAssessmentReport(page);

    // Intercept window.open and track the URL called
    const openedUrls: string[] = [];
    await page.exposeFunction('__captureWindowOpen', (url: string) => {
      openedUrls.push(url);
    });
    await page.evaluate(() => {
      const originalOpen = window.open;
      window.open = function(url?: string | URL, ...args: any[]) {
        if (url) (window as any).__captureWindowOpen(String(url));
        return originalOpen.call(window, url, ...args);
      };
    });

    // Click the Fillable PDF button
    const fillablePdfBtn = page.locator('button:has-text("Fillable PDF")');
    await fillablePdfBtn.click();
    await page.waitForTimeout(1000);

    // Verify window.open was called with the correct URL
    expect(openedUrls.length).toBeGreaterThan(0);
    expect(openedUrls[0]).toContain('/export/fillable-pdf');
  });

  test('hidden PDF import file input exists', async ({ page }) => {
    await navigateToAssessmentReport(page);

    const fileInput = page.locator('#pdfImportInput');
    await expect(fileInput).toBeAttached();
    await expect(fileInput).toHaveAttribute('accept', '.pdf');
  });

  test('fillable PDF export API returns valid PDF', async ({ request }) => {
    const response = await request.get('/api/v1/assessments/11/export/fillable-pdf');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');

    const body = await response.body();
    // PDF files start with %PDF
    expect(body.toString('utf-8', 0, 4)).toBe('%PDF');
    expect(body.length).toBeGreaterThan(1000);
  });

  test('fillable PDF import API returns success', async ({ request }) => {
    // Export a PDF first
    const exportResponse = await request.get('/api/v1/assessments/11/export/fillable-pdf');
    expect(exportResponse.status()).toBe(200);
    const pdfBody = await exportResponse.body();

    // Import it back (should update 0 questions since scores are unchanged)
    const importResponse = await request.post('/api/v1/assessments/11/import/fillable-pdf', {
      multipart: {
        file: {
          name: 'assessment.pdf',
          mimeType: 'application/pdf',
          buffer: pdfBody,
        }
      }
    });
    expect(importResponse.status()).toBe(200);
    const result = await importResponse.json();
    expect(result.success).toBe(true);
    expect(typeof result.questions_updated).toBe('number');
    expect(typeof result.overall_score).toBe('number');
  });

  test('no JavaScript console errors on report modal', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await navigateToAssessmentReport(page);

    // Filter out non-critical errors
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('net::ERR_') &&
      !e.includes('404')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
