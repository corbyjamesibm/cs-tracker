import { test, expect } from '@playwright/test';

test.describe('Sankey Debug', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('debug SPM Sankey chart', async ({ page }) => {
    // Capture console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    // Go to customer 17
    await page.goto('/customer-detail.html?id=17');
    await page.waitForLoadState('networkidle');

    // Click Journey tab
    const journeyTab = page.locator('.tabs__tab').filter({ hasText: /journey/i });
    await journeyTab.click();
    await page.waitForTimeout(2000);

    // Check what the stats show
    const weakDimsCount = await page.locator('#flowWeakDimensionsCount').textContent();
    const useCasesCount = await page.locator('#flowUseCasesCount').textContent();
    const tpFeaturesCount = await page.locator('#flowTPFeaturesCount').textContent();

    console.log('Stats for SPM:');
    console.log('  Weak Dimensions:', weakDimsCount);
    console.log('  Use Cases:', useCasesCount);
    console.log('  TP Features:', tpFeaturesCount);

    // Take a screenshot
    await page.screenshot({ path: 'sankey-debug-spm.png', fullPage: false });

    // Print console logs that contain our debug info
    console.log('\nConsole logs:');
    consoleLogs.forEach(log => {
      if (log.includes('Sankey') || log.includes('renderFlow') || log.includes('filteredNodes')) {
        console.log('  ', log);
      }
    });

    // Check tables for use cases
    const useCasesTableBody = page.locator('#flowUseCasesTableBody');
    const useCaseRows = useCasesTableBody.locator('tr');
    const useCaseCount = await useCaseRows.count();
    console.log(`\nUse cases in table: ${useCaseCount}`);

    // Check tables for TP features
    const tpTableBody = page.locator('#flowTPFeaturesTableBody');
    const tpRows = tpTableBody.locator('tr');
    const tpCount = await tpRows.count();
    console.log(`TP features in table: ${tpCount}`);

    // Verify counts match
    expect(parseInt(useCasesCount || '0')).toBeGreaterThan(0);
    expect(parseInt(tpFeaturesCount || '0')).toBeGreaterThan(0);
  });

  test('debug TBM Sankey chart', async ({ page }) => {
    // Capture network requests
    const apiRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('flow-visualization')) {
        apiRequests.push(request.url());
      }
    });

    // Go to customer 17
    await page.goto('/customer-detail.html?id=17');
    await page.waitForLoadState('networkidle');

    // Click Journey tab
    const journeyTab = page.locator('.tabs__tab').filter({ hasText: /journey/i });
    await journeyTab.click();
    await page.waitForTimeout(1000);

    console.log('API requests before TBM switch:', apiRequests);

    // Switch to TBM by clicking the tab button
    const tbmTab = page.locator('#flowAssessmentTypeTabs .assessment-type-tab[data-type="tbm"]');
    await tbmTab.click();

    await page.waitForTimeout(2000);

    console.log('API requests after TBM switch:', apiRequests);

    // Check what the stats show
    const weakDimsCount = await page.locator('#flowWeakDimensionsCount').textContent();
    const useCasesCount = await page.locator('#flowUseCasesCount').textContent();
    const tpFeaturesCount = await page.locator('#flowTPFeaturesCount').textContent();

    console.log('Stats for TBM:');
    console.log('  Weak Dimensions:', weakDimsCount);
    console.log('  Use Cases:', useCasesCount);
    console.log('  TP Features:', tpFeaturesCount);

    // Take a screenshot
    await page.screenshot({ path: 'sankey-debug-tbm.png', fullPage: false });

    // Check tables for use cases
    const useCasesTableBody = page.locator('#flowUseCasesTableBody');
    const useCaseRows = useCasesTableBody.locator('tr');
    const useCaseCount = await useCaseRows.count();
    console.log(`\nUse cases in table: ${useCaseCount}`);

    // Verify counts match
    expect(parseInt(useCasesCount || '0')).toBeGreaterThan(0);
    expect(parseInt(tpFeaturesCount || '0')).toBeGreaterThan(0);
  });
});
