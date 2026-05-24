import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';

test.setTimeout(3_600_000);

test.describe.configure({ mode: 'serial' });

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

let generatedScheduleId: string | null = null;

test.describe('Schedule Generation', () => {
  test('generates a schedule for a complex institution', async ({ adminPage }) => {
    const fixtures = loadFixtures();
    const schedulesUrl = `/institutions/${fixtures.complexInstitutionId}/schedules`;

    await adminPage.goto(schedulesUrl);
    await adminPage.waitForLoadState('networkidle');

    // Click generate new schedule button
    const generateBtn = adminPage.getByRole('button', { name: 'Generate new schedule' });
    await expect(generateBtn).toBeVisible({ timeout: 10_000 });
    await generateBtn.click();

    // Wait for a schedule Paper to appear in the list
    await expect(adminPage.locator('[class*="MuiPaper"]').first()).toBeVisible({ timeout: 30_000 });

    // Wait for the schedule to complete (up to 58 minutes)
    await adminPage.waitForFunction(
      () => {
        const chips = Array.from(document.querySelectorAll('[class*="MuiChip"]'));
        return chips.some(
          (c) => c.textContent === 'completed' || c.textContent === 'failed'
        );
      },
      { timeout: 3_500_000 }
    );

    // Reload to get fresh state
    await adminPage.reload();
    await adminPage.waitForLoadState('networkidle');

    // Assert the schedule completed successfully
    const completedChip = adminPage.locator('[class*="MuiChip"]').filter({ hasText: 'completed' });
    await expect(completedChip.first()).toBeVisible({ timeout: 15_000 });

    // Ensure there is no "failed" chip
    const failedChip = adminPage.locator('[class*="MuiChip"]').filter({ hasText: 'failed' });
    expect(await failedChip.count()).toBe(0);
  });

  test('sets generated schedule as active', async ({ adminPage }) => {
    const fixtures = loadFixtures();
    const schedulesUrl = `/institutions/${fixtures.complexInstitutionId}/schedules`;

    await adminPage.goto(schedulesUrl);
    await adminPage.waitForLoadState('networkidle');

    // Find the "Set as active" star icon button for the completed schedule
    const setActiveBtn = adminPage.getByRole('button', { name: 'Set as active' });
    await expect(setActiveBtn.first()).toBeVisible({ timeout: 15_000 });
    await setActiveBtn.first().click();

    // After setting active, an "Active" chip should appear
    await adminPage.waitForLoadState('networkidle');
    await expect(
      adminPage.locator('[class*="MuiChip"]').filter({ hasText: 'Active' }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('deletes a schedule', async ({ adminPage }) => {
    const fixtures = loadFixtures();
    const schedulesUrl = `/institutions/${fixtures.complexInstitutionId}/schedules`;

    // Navigate to the schedules page
    await adminPage.goto(schedulesUrl);
    await adminPage.waitForLoadState('networkidle');

    // Count schedules before generating a new one
    const initialPapers = await adminPage.locator('[class*="MuiPaper"]').count();

    // Generate a new schedule to delete
    const generateBtn = adminPage.getByRole('button', { name: 'Generate new schedule' });
    await expect(generateBtn).toBeVisible({ timeout: 10_000 });
    await generateBtn.click();

    // Wait for new schedule to appear (count should increase)
    await adminPage.waitForFunction(
      (initial: number) => {
        const papers = document.querySelectorAll('[class*="MuiPaper"]');
        return papers.length > initial;
      },
      initialPapers,
      { timeout: 30_000 }
    );

    // Click the delete icon on the newest (first) schedule in the list.
    // The newest schedule is sorted to the top by the UI.
    const deleteButtons = adminPage.getByRole('button', { name: 'Delete' });
    await expect(deleteButtons.first()).toBeVisible({ timeout: 10_000 });
    const paperCountBefore = await adminPage.locator('[class*="MuiPaper-root"]').count();
    await deleteButtons.first().click();

    // Confirm dialog
    await expect(adminPage.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByRole('heading', { name: 'Delete schedule?' })).toBeVisible();
    // There are two "Delete" buttons: one in the list (already clicked) and one in the dialog.
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

    // Dialog should close
    await expect(adminPage.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });

    // Paper count should decrease by 1
    await adminPage.waitForFunction(
      (before: number) => {
        const papers = document.querySelectorAll('[class*="MuiPaper-root"]');
        return papers.length < before;
      },
      paperCountBefore,
      { timeout: 15_000 }
    );
  });
});
