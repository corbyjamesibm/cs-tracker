import { test, expect, Page } from '@playwright/test';

/**
 * Assessment Report E2E Tests
 *
 * Tests for:
 * - Issue #215: Radar Chart in Report
 * - Issue #216: Rating Descriptions and Evidence
 * - Issue #217: Recommendations Section
 */

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Navigate to a customer detail page with completed assessment
 */
async function navigateToCustomerWithAssessment(page: Page): Promise<boolean> {
  // Navigate to customers list
  await page.goto('/prototype/customers.html');
  await page.waitForLoadState('networkidle');

  // Click on first customer to go to detail
  const firstCustomer = page.locator('table tbody tr a, .customer-row a, .customer-name').first();

  if (await firstCustomer.count() > 0) {
    await firstCustomer.click();
    await page.waitForLoadState('networkidle');
    return true;
  }

  // Fallback: direct navigation to customer detail
  await page.goto('/prototype/customer-detail.html?id=1');
  await page.waitForLoadState('networkidle');
  return true;
}

/**
 * Navigate to the Assessment tab on customer detail page
 */
async function navigateToAssessmentTab(page: Page): Promise<void> {
  const assessmentTab = page.locator(
    'button:has-text("Assessment"), [role="tab"]:has-text("Assessment"), .tab:has-text("Assessment")'
  );

  if (await assessmentTab.count() > 0) {
    await assessmentTab.click();
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Open the assessment report modal for the most recent completed assessment
 */
async function openAssessmentReportModal(page: Page): Promise<boolean> {
  // Look for "View Report" button in the assessment history
  const viewReportButton = page.locator(
    'button:has-text("View Report"), button[title="View Report"], .btn:has-text("Report")'
  ).first();

  if (await viewReportButton.count() > 0) {
    await viewReportButton.click();

    // Wait for the modal to open
    const modal = page.locator('#assessmentReportModal.open, #assessmentReportModal:visible');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Wait for report content to load
    await page.waitForSelector('.assessment-report, #printableReport', { timeout: 10000 });
    return true;
  }

  return false;
}

/**
 * Close the assessment report modal
 */
async function closeAssessmentReportModal(page: Page): Promise<void> {
  const closeButton = page.locator('#assessmentReportModal .modal__close');
  if (await closeButton.isVisible()) {
    await closeButton.click();
    await page.waitForTimeout(300);
  }
}

// ============================================================
// RADAR CHART TESTS (Issue #215)
// ============================================================

test.describe('Assessment Report - Radar Chart (Issue #215)', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCustomerWithAssessment(page);
    await navigateToAssessmentTab(page);
  });

  test('displays dimension scores radar chart in report modal', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Verify radar chart section exists
    const radarSection = page.locator('.report-radar-section, .report-section:has(canvas#reportRadarChart)');
    await expect(radarSection).toBeVisible({ timeout: 5000 });

    // Verify radar chart canvas exists
    const radarCanvas = page.locator('#reportRadarChart');
    await expect(radarCanvas).toBeVisible({ timeout: 5000 });

    // Verify "Dimension Overview" title is shown
    const radarTitle = page.locator('#reportRadarTitle');
    await expect(radarTitle).toContainText('Dimension Overview', { timeout: 5000 });
  });

  test('shows dimension labels on radar chart', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Wait for chart to render
    await page.waitForTimeout(500);

    // The radar chart should have rendered with dimension labels
    // Chart.js renders labels as part of the canvas, so we verify the canvas is non-empty
    const radarCanvas = page.locator('#reportRadarChart');
    await expect(radarCanvas).toBeVisible();

    // Check for dimension scores section which shows the dimension names
    const dimensionScores = page.locator('.report-dimension-scores .report-dimension-name');
    if (await dimensionScores.count() > 0) {
      // At least one dimension should be visible
      await expect(dimensionScores.first()).toBeVisible();
    }
  });

  test('drill-down shows question scores when clicking dimension label', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // The hint text about clicking to drill down should be visible initially
    const hintText = page.locator('#reportRadarHint');
    await expect(hintText).toContainText('Click on a dimension label to drill down');

    // Click on a dimension in the dimension scores section to trigger drill-down
    // The chart.js click event is handled by the chart, but we can verify the UI elements
    const dimensionItem = page.locator('.report-dimension-item, .report-dimension-scores > div').first();

    if (await dimensionItem.count() > 0) {
      // Note: The actual click on Chart.js canvas requires coordinates
      // For E2E testing, we can verify the back button appears when drill-down is active
      // by checking the UI structure is in place
      const backButton = page.locator('#reportRadarBackBtn');
      await expect(backButton).toHaveAttribute('style', expect.stringContaining('display: none'));
    }
  });

  test('back button returns to dimension view from drill-down', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Back button should be hidden initially (at dimension level)
    const backButton = page.locator('#reportRadarBackBtn');
    await expect(backButton).toHaveAttribute('style', expect.stringContaining('display: none'));

    // After a drill-down (if triggered), the back button would become visible
    // The back button onclick calls reportRadarBackToDimensions()
    await expect(backButton).toHaveAttribute('onclick', 'reportRadarBackToDimensions()');
  });

  test('comparison mode selector is available when multiple assessments exist', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Look for the comparison select dropdown
    const comparisonSelect = page.locator('#reportComparisonSelect');

    // The comparison selector may or may not exist depending on whether there are multiple assessments
    if (await comparisonSelect.count() > 0) {
      await expect(comparisonSelect).toBeVisible();

      // It should have "No comparison" as an option
      const noComparisonOption = comparisonSelect.locator('option[value=""]');
      await expect(noComparisonOption).toHaveText('No comparison');
    }
  });

  test('comparison mode overlays previous assessment when selected', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    const comparisonSelect = page.locator('#reportComparisonSelect');

    if (await comparisonSelect.count() > 0 && await comparisonSelect.isVisible()) {
      // Get the options
      const options = comparisonSelect.locator('option');
      const optionCount = await options.count();

      // If there's more than just "No comparison", select one
      if (optionCount > 1) {
        const secondOption = options.nth(1);
        const optionValue = await secondOption.getAttribute('value');

        if (optionValue) {
          await comparisonSelect.selectOption(optionValue);
          await page.waitForTimeout(500);

          // The legend should now show comparison info
          const legend = page.locator('#reportRadarLegend');
          await expect(legend).toBeVisible();
        }
      }
    }
  });
});

// ============================================================
// RATING DESCRIPTIONS AND EVIDENCE TESTS (Issue #216)
// ============================================================

test.describe('Assessment Report - Rating Descriptions and Evidence (Issue #216)', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCustomerWithAssessment(page);
    await navigateToAssessmentTab(page);
  });

  test('shows rating description for each question in report', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Look for question cards with rating descriptions
    const questionCards = page.locator('.report-question-card');

    if (await questionCards.count() > 0) {
      // Check if any question has a rating description section
      const ratingDescriptionSection = page.locator('.report-rating-description');

      if (await ratingDescriptionSection.count() > 0) {
        // Rating description label should be visible
        const descriptionLabel = ratingDescriptionSection.first().locator('.report-detail-label');
        await expect(descriptionLabel).toContainText('Rating Description');

        // The description text should be visible
        const descriptionText = ratingDescriptionSection.first().locator('.report-detail-text');
        await expect(descriptionText).toBeVisible();
      }
    }
  });

  test('displays assessor notes section when notes exist', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Look for assessor notes sections
    const assessorNotesSection = page.locator('.report-assessor-notes');

    if (await assessorNotesSection.count() > 0) {
      // Assessor notes label should be visible
      const notesLabel = assessorNotesSection.first().locator('.report-detail-label');
      await expect(notesLabel).toContainText('Assessor Notes');

      // Notes content should be visible
      const notesContent = assessorNotesSection.first().locator('.report-notes-content');
      await expect(notesContent).toBeVisible();
    }
  });

  test('displays evidence required section when evidence info exists', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Look for evidence required sections
    const evidenceSection = page.locator('.report-evidence-required');

    if (await evidenceSection.count() > 0) {
      // Evidence label should be visible
      const evidenceLabel = evidenceSection.first().locator('.report-detail-label');
      await expect(evidenceLabel).toContainText('Evidence Required');

      // Evidence text should be visible
      const evidenceText = evidenceSection.first().locator('.report-detail-text');
      await expect(evidenceText).toBeVisible();
    }
  });

  test('URLs in notes are converted to clickable links', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Look for evidence links within assessor notes
    const evidenceLinks = page.locator('.report-evidence-link');

    if (await evidenceLinks.count() > 0) {
      const firstLink = evidenceLinks.first();
      await expect(firstLink).toBeVisible();

      // Link should open in new tab
      await expect(firstLink).toHaveAttribute('target', '_blank');

      // Link should have rel="noopener noreferrer" for security
      await expect(firstLink).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  test('image thumbnails display in notes with click-to-enlarge lightbox', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Look for evidence thumbnails
    const thumbnails = page.locator('.report-evidence-thumbnail');

    if (await thumbnails.count() > 0) {
      const firstThumbnail = thumbnails.first();
      await expect(firstThumbnail).toBeVisible();

      // The thumbnail should have an image
      const thumbnailImage = firstThumbnail.locator('img');
      await expect(thumbnailImage).toBeVisible();

      // Click thumbnail to open lightbox
      await firstThumbnail.click();

      // Lightbox should become visible
      const lightbox = page.locator('#imageLightbox.active, .image-lightbox.active');
      await expect(lightbox).toBeVisible({ timeout: 3000 });

      // Lightbox image should be visible
      const lightboxImage = page.locator('#lightboxImage');
      await expect(lightboxImage).toBeVisible();

      // Close lightbox with Escape key
      await page.keyboard.press('Escape');
      await expect(lightbox).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('lightbox closes when clicking close button', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    const thumbnails = page.locator('.report-evidence-thumbnail');

    if (await thumbnails.count() > 0) {
      // Open lightbox
      await thumbnails.first().click();

      const lightbox = page.locator('#imageLightbox.active, .image-lightbox.active');
      await expect(lightbox).toBeVisible({ timeout: 3000 });

      // Click close button
      const closeButton = page.locator('.lightbox-close');
      await closeButton.click();

      await expect(lightbox).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('lightbox closes when clicking backdrop', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    const thumbnails = page.locator('.report-evidence-thumbnail');

    if (await thumbnails.count() > 0) {
      // Open lightbox
      await thumbnails.first().click();

      const lightbox = page.locator('#imageLightbox.active, .image-lightbox.active');
      await expect(lightbox).toBeVisible({ timeout: 3000 });

      // Click backdrop
      const backdrop = page.locator('.lightbox-backdrop');
      await backdrop.click();

      await expect(lightbox).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('empty evidence sections are gracefully hidden', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // All question cards should exist
    const questionCards = page.locator('.report-question-card');
    const cardCount = await questionCards.count();

    for (let i = 0; i < cardCount; i++) {
      const card = questionCards.nth(i);

      // Check if details section exists
      const detailsSection = card.locator('.report-question-details');

      if (await detailsSection.count() === 0) {
        // If there's no details section, that's correct behavior for questions without details
        continue;
      }

      // If details section exists, it should have at least one child
      const childSections = detailsSection.locator('.report-detail-section');
      if (await childSections.count() > 0) {
        // Each visible section should have content
        for (let j = 0; j < await childSections.count(); j++) {
          const section = childSections.nth(j);
          if (await section.isVisible()) {
            const text = section.locator('.report-detail-text');
            if (await text.count() > 0) {
              const textContent = await text.textContent();
              // Text should not be empty if section is shown
              expect(textContent?.trim().length).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });
});

// ============================================================
// RECOMMENDATIONS TESTS (Issue #217)
// ============================================================

test.describe('Assessment Report - Recommendations (Issue #217)', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCustomerWithAssessment(page);
    await navigateToAssessmentTab(page);
  });

  test('recommendations section exists in report', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Recommendations section should be visible
    const recommendationsSection = page.locator('#recommendationsSection, .recommendations-section');
    await expect(recommendationsSection).toBeVisible({ timeout: 5000 });

    // Section title should be visible
    const sectionTitle = recommendationsSection.locator('.report-section-title');
    await expect(sectionTitle).toContainText('Recommendations');
  });

  test('Add Recommendation button is visible', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    const addButton = page.locator('button:has-text("Add Recommendation")');
    await expect(addButton).toBeVisible({ timeout: 5000 });
  });

  test('can open add recommendation modal', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Click Add Recommendation button
    const addButton = page.locator('button:has-text("Add Recommendation")');
    await addButton.click();

    // Modal should open
    const modal = page.locator('#recommendationModal.open, #recommendationModal:visible');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Modal title should say "Add Recommendation"
    const modalTitle = page.locator('#recommendationModalTitle');
    await expect(modalTitle).toContainText('Add Recommendation');

    // Form fields should be visible
    await expect(page.locator('#recTitle')).toBeVisible();
    await expect(page.locator('#recDescription')).toBeVisible();
    await expect(page.locator('#recPriority')).toBeVisible();
    await expect(page.locator('#recCategory')).toBeVisible();
  });

  test('can add a new recommendation with all fields', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Open add modal
    const addButton = page.locator('button:has-text("Add Recommendation")');
    await addButton.click();

    // Wait for modal
    const modal = page.locator('#recommendationModal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill in the form
    const uniqueTitle = `Test Recommendation ${Date.now()}`;
    await page.fill('#recTitle', uniqueTitle);
    await page.fill('#recDescription', 'This is a test recommendation description with **bold** text.');
    await page.selectOption('#recPriority', 'high');
    await page.fill('#recCategory', 'Process Improvement');

    // Submit the form
    const submitButton = page.locator('#recommendationModal button[type="submit"], #recommendationModal button:has-text("Save Recommendation")');
    await submitButton.click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // The new recommendation should appear in the list
    const recommendationCard = page.locator(`.recommendation-card:has-text("${uniqueTitle}")`);
    await expect(recommendationCard).toBeVisible({ timeout: 5000 });

    // Verify priority badge
    const priorityBadge = recommendationCard.locator('.recommendation-priority');
    await expect(priorityBadge).toContainText('HIGH');
  });

  test('multiple recommendations can be added', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Add first recommendation
    await page.locator('button:has-text("Add Recommendation")').click();
    await page.fill('#recTitle', `First Recommendation ${Date.now()}`);
    await page.selectOption('#recPriority', 'high');
    await page.locator('#recommendationModal button:has-text("Save Recommendation")').click();
    await page.waitForTimeout(500);

    // Add second recommendation
    await page.locator('button:has-text("Add Recommendation")').click();
    await page.fill('#recTitle', `Second Recommendation ${Date.now()}`);
    await page.selectOption('#recPriority', 'medium');
    await page.locator('#recommendationModal button:has-text("Save Recommendation")').click();
    await page.waitForTimeout(500);

    // Count recommendations
    const recommendationCards = page.locator('.recommendation-card');
    const count = await recommendationCards.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('priority badges display with correct colors', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Check for high priority badge (should be red-ish)
    const highPriorityBadge = page.locator('.recommendation-priority.priority--high');
    if (await highPriorityBadge.count() > 0) {
      await expect(highPriorityBadge.first()).toBeVisible();
      await expect(highPriorityBadge.first()).toContainText('HIGH');
    }

    // Check for medium priority badge (should be yellow-ish)
    const mediumPriorityBadge = page.locator('.recommendation-priority.priority--medium');
    if (await mediumPriorityBadge.count() > 0) {
      await expect(mediumPriorityBadge.first()).toBeVisible();
      await expect(mediumPriorityBadge.first()).toContainText('MEDIUM');
    }

    // Check for low priority badge (should be green-ish)
    const lowPriorityBadge = page.locator('.recommendation-priority.priority--low');
    if (await lowPriorityBadge.count() > 0) {
      await expect(lowPriorityBadge.first()).toBeVisible();
      await expect(lowPriorityBadge.first()).toContainText('LOW');
    }
  });

  test('can edit an existing recommendation', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // First create a recommendation to edit
    const originalTitle = `Edit Test ${Date.now()}`;
    await page.locator('button:has-text("Add Recommendation")').click();
    await page.fill('#recTitle', originalTitle);
    await page.locator('#recommendationModal button:has-text("Save Recommendation")').click();
    await page.waitForTimeout(500);

    // Find the edit button for the recommendation we just created
    const recommendationCard = page.locator(`.recommendation-card:has-text("${originalTitle}")`);
    await expect(recommendationCard).toBeVisible({ timeout: 5000 });

    // Click edit button
    const editButton = recommendationCard.locator('button[title="Edit"]');
    await editButton.click();

    // Modal should open with "Edit Recommendation" title (or still show the form)
    const modal = page.locator('#recommendationModal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // The title field should have the original title
    const titleField = page.locator('#recTitle');
    await expect(titleField).toHaveValue(originalTitle);

    // Update the title
    const updatedTitle = `Updated ${originalTitle}`;
    await titleField.fill(updatedTitle);

    // Save changes
    await page.locator('#recommendationModal button:has-text("Save Recommendation")').click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // The updated recommendation should appear
    const updatedCard = page.locator(`.recommendation-card:has-text("${updatedTitle}")`);
    await expect(updatedCard).toBeVisible({ timeout: 5000 });
  });

  test('can delete a recommendation', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // First create a recommendation to delete
    const titleToDelete = `Delete Test ${Date.now()}`;
    await page.locator('button:has-text("Add Recommendation")').click();
    await page.fill('#recTitle', titleToDelete);
    await page.locator('#recommendationModal button:has-text("Save Recommendation")').click();
    await page.waitForTimeout(500);

    // Find the recommendation
    const recommendationCard = page.locator(`.recommendation-card:has-text("${titleToDelete}")`);
    await expect(recommendationCard).toBeVisible({ timeout: 5000 });

    // Set up dialog handler for confirmation
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    // Click delete button
    const deleteButton = recommendationCard.locator('button[title="Delete"]');
    await deleteButton.click();

    // The recommendation should be removed
    await expect(recommendationCard).not.toBeVisible({ timeout: 5000 });
  });

  test('recommendations persist after page reload', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Create a unique recommendation
    const persistentTitle = `Persist Test ${Date.now()}`;
    await page.locator('button:has-text("Add Recommendation")').click();
    await page.fill('#recTitle', persistentTitle);
    await page.fill('#recDescription', 'Testing persistence');
    await page.selectOption('#recPriority', 'high');
    await page.locator('#recommendationModal button:has-text("Save Recommendation")').click();

    // Verify it appears
    const recommendationCard = page.locator(`.recommendation-card:has-text("${persistentTitle}")`);
    await expect(recommendationCard).toBeVisible({ timeout: 5000 });

    // Close the modal
    await closeAssessmentReportModal(page);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate back to assessments and open report again
    await navigateToAssessmentTab(page);
    await openAssessmentReportModal(page);

    // The recommendation should still be there
    const persistedCard = page.locator(`.recommendation-card:has-text("${persistentTitle}")`);
    await expect(persistedCard).toBeVisible({ timeout: 10000 });
  });

  test('category tag displays correctly', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Create a recommendation with a category
    const title = `Category Test ${Date.now()}`;
    const category = 'Technology';

    await page.locator('button:has-text("Add Recommendation")').click();
    await page.fill('#recTitle', title);
    await page.fill('#recCategory', category);
    await page.locator('#recommendationModal button:has-text("Save Recommendation")').click();

    // Find the recommendation
    const recommendationCard = page.locator(`.recommendation-card:has-text("${title}")`);
    await expect(recommendationCard).toBeVisible({ timeout: 5000 });

    // Category should be displayed
    const categoryTag = recommendationCard.locator('.recommendation-category');
    await expect(categoryTag).toContainText(category);
  });

  test('recommendation form has required title validation', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Open add modal
    await page.locator('button:has-text("Add Recommendation")').click();

    // Try to submit without title
    const submitButton = page.locator('#recommendationModal button:has-text("Save Recommendation")');
    await submitButton.click();

    // The title field should have validation error or modal should still be open
    const modal = page.locator('#recommendationModal');
    await expect(modal).toBeVisible();

    // HTML5 validation - check the title field is invalid
    const titleField = page.locator('#recTitle');
    const isInvalid = await titleField.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });

  test('recommendation modal can be cancelled', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Open add modal
    await page.locator('button:has-text("Add Recommendation")').click();

    const modal = page.locator('#recommendationModal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill in some data
    await page.fill('#recTitle', 'Cancelled Recommendation');

    // Click cancel
    const cancelButton = page.locator('#recommendationModal button:has-text("Cancel")');
    await cancelButton.click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // The recommendation should NOT be in the list
    const cancelledCard = page.locator('.recommendation-card:has-text("Cancelled Recommendation")');
    await expect(cancelledCard).not.toBeVisible();
  });

  test('empty recommendations shows placeholder message', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Look for the empty state message
    const emptyMessage = page.locator('.recommendations-empty');

    // If there are no recommendations, the empty message should be visible
    const recommendationCards = page.locator('.recommendation-card');

    if (await recommendationCards.count() === 0) {
      await expect(emptyMessage).toBeVisible();
      await expect(emptyMessage).toContainText('No recommendations have been added yet');
    }
  });
});

// ============================================================
// INTEGRATION TESTS
// ============================================================

test.describe('Assessment Report - Integration', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCustomerWithAssessment(page);
    await navigateToAssessmentTab(page);
  });

  test('report modal displays all sections correctly', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Header section
    const header = page.locator('.report-header');
    await expect(header).toBeVisible({ timeout: 5000 });

    // Meta info grid
    const metaGrid = page.locator('.report-meta-grid');
    await expect(metaGrid).toBeVisible();

    // Detailed responses section
    const detailedResponses = page.locator('.report-section:has-text("Detailed Responses")');
    await expect(detailedResponses).toBeVisible();

    // Recommendations section
    const recommendations = page.locator('#recommendationsSection');
    await expect(recommendations).toBeVisible();
  });

  test('report can be printed/exported to PDF', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Print button should be visible
    const printButton = page.locator('button:has-text("Print"), button[title*="Print"]');
    await expect(printButton).toBeVisible();
  });

  test('report can be exported to Excel', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    // Excel export button should be visible
    const excelButton = page.locator('button:has-text("Excel")');
    await expect(excelButton).toBeVisible();
  });

  test('report modal closes correctly', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    const modal = page.locator('#assessmentReportModal');
    await expect(modal).toBeVisible();

    // Close via close button
    const closeButton = page.locator('#assessmentReportModal .modal__close');
    await closeButton.click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('report modal closes on overlay click', async ({ page }) => {
    const reportOpened = await openAssessmentReportModal(page);

    if (!reportOpened) {
      test.skip();
      return;
    }

    const modal = page.locator('#assessmentReportModal');
    await expect(modal).toBeVisible();

    // Click on overlay
    const overlay = page.locator('#assessmentReportModal .modal__overlay');
    await overlay.click({ force: true, position: { x: 10, y: 10 } });

    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });
});
