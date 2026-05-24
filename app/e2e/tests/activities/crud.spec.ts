import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

test.describe('Activities', () => {
  // The activities page fires 4 parallel API calls before rendering — give each
  // test a generous overall budget so the 30 s global default isn't hit while
  // beforeEach + data-load are still in progress.
  test.setTimeout(90_000);

  test.beforeEach(async ({ adminPage }) => {
    const fixtures = loadFixtures();
    // Just navigate; let the per-assertion timeouts below handle waiting for
    // the data to appear (avoids consuming the test budget on networkidle).
    await adminPage.goto(`/institutions/${fixtures.simpleInstitutionId}/activities`);
  });

  test('shows existing activities', async ({ adminPage }) => {
    // The Tabs ("By group" / "By professor" / "By course") only mount once
    // activities are fetched from the API — waiting for the tab is a reliable
    // data-loaded gate.
    await expect(adminPage.getByRole('tab', { name: 'By group' })).toBeVisible({ timeout: 30_000 });

    // Now the accordion summaries for Group A and Group B should be visible.
    await expect(
      adminPage.locator('[class*="MuiAccordionSummary"]').filter({ hasText: 'Group A' }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      adminPage.locator('[class*="MuiAccordionSummary"]').filter({ hasText: 'Group B' }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('has laboratory type activities', async ({ adminPage }) => {
    // Wait for data to load first (Tabs only render when activities.length > 0).
    await expect(adminPage.getByRole('tab', { name: 'By group' })).toBeVisible({ timeout: 30_000 });

    // Group B has a CS laboratory activity (created in global-setup).
    // Expand the accordion and verify the type label is visible.
    const groupBSummary = adminPage
      .locator('[class*="MuiAccordionSummary"]')
      .filter({ hasText: 'Group B' })
      .first();
    await expect(groupBSummary).toBeVisible({ timeout: 10_000 });
    await groupBSummary.click();

    // After expansion the activity rows become visible.
    await expect(adminPage.getByText(/Laboratory/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
