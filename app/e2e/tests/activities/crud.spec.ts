import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

test.describe('Activities', () => {
  test.beforeEach(async ({ adminPage }) => {
    const fixtures = loadFixtures();
    await adminPage.goto(`/institutions/${fixtures.simpleInstitutionId}/activities`);
    await adminPage.waitForLoadState('networkidle');
  });

  test('shows existing activities', async ({ adminPage }) => {
    // Activities are organised in collapsed Accordion panels, grouped by group/course/professor.
    // The Tabs ("By group" / "By professor" / "By course") only mount once activities are
    // fetched from the API — waiting for the tab is a reliable data-loaded gate.
    await expect(adminPage.getByRole('tab', { name: 'By group' })).toBeVisible({ timeout: 25_000 });

    // Now the accordion summaries for Group A and Group B should be visible.
    await expect(
      adminPage.locator('[class*="MuiAccordionSummary"]').filter({ hasText: 'Group A' }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      adminPage.locator('[class*="MuiAccordionSummary"]').filter({ hasText: 'Group B' }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('has laboratory type activities', async ({ adminPage }) => {
    // Group B has a CS laboratory activity.  Expand the Group B accordion and verify
    // the activity row shows "Laboratory" as the activity type.

    // Wait for data to load first (Tabs only render when activities.length > 0).
    await expect(adminPage.getByRole('tab', { name: 'By group' })).toBeVisible({ timeout: 25_000 });

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
