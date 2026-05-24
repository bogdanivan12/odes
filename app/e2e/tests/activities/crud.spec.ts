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
    await adminPage.goto(`/institutions/${fixtures.simpleInstitutionId}`);
    await adminPage.waitForLoadState('networkidle');
    await adminPage.getByRole('tab', { name: 'Activities' }).click();
    await adminPage.waitForLoadState('networkidle');
  });

  test('shows existing activities', async ({ adminPage }) => {
    // We should see activities for Mathematics and Computer Science
    await expect(adminPage.getByText('Mathematics')).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByText('Computer Science')).toBeVisible({ timeout: 10_000 });
  });

  test('laboratory activity has laborator feature', async ({ adminPage }) => {
    // The CS laboratory activity should show the "laborator" feature chip
    // Look for it in the activities list
    await expect(adminPage.getByText('laborator')).toBeVisible({ timeout: 10_000 });
  });
});
