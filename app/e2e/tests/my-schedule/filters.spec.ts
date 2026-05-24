import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

test.describe('My Schedule', () => {
  test('my schedule page loads', async ({ studentPage }) => {
    await studentPage.goto('/my-schedule');
    await studentPage.waitForLoadState('networkidle');

    // Page should have some visible content (header or schedule area)
    const pageContent = studentPage
      .getByRole('heading')
      .or(studentPage.getByText(/my schedule/i))
      .or(studentPage.locator('main'))
      .first();
    await expect(pageContent).toBeVisible({ timeout: 10_000 });
  });

  test('institution filter chip exists', async ({ studentPage }) => {
    const fixtures = loadFixtures();
    await studentPage.goto('/my-schedule');
    await studentPage.waitForLoadState('networkidle');

    // There should be at least one filter chip for the institution the student belongs to
    // The student belongs to E2E Test University
    const institutionChip = studentPage
      .locator('[class*="MuiChip"]')
      .filter({ hasText: fixtures.simpleInstitutionName })
      .or(
        studentPage.locator('[class*="MuiChip"]').filter({ hasText: 'E2E Test University' })
      )
      .first();

    await expect(institutionChip).toBeVisible({ timeout: 10_000 });
  });
});
