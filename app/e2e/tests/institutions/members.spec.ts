import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

test.describe('Institution Members', () => {
  test.beforeEach(async ({ adminPage }) => {
    const fixtures = loadFixtures();
    await adminPage.goto(`/institutions/${fixtures.simpleInstitutionId}/members`);
    await adminPage.waitForLoadState('networkidle');
  });

  test('shows professor in members list', async ({ adminPage }) => {
    await expect(adminPage.getByText('E2E Professor')).toBeVisible({ timeout: 10_000 });
  });

  test('shows student in members list', async ({ adminPage }) => {
    await expect(adminPage.getByText('E2E Student')).toBeVisible({ timeout: 10_000 });
  });
});
