import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

test.describe('Institutions CRUD', () => {
  test('creates an institution', async ({ adminPage }) => {
    const uniqueName = `E2E Institution ${Date.now()}`;
    await adminPage.goto('/institutions');
    await adminPage.getByRole('button', { name: 'New institution' }).click();
    await adminPage.waitForURL(/\/institutions\/new/, { timeout: 10_000 });

    await adminPage.getByLabel('Institution name').fill(uniqueName);
    // Week rotation field
    await adminPage.getByLabel('Week rotation').fill('2');
    await adminPage.getByRole('button', { name: 'Create institution' }).click();

    // Should redirect to institutions list and show the new institution
    await adminPage.waitForURL(/\/institutions$/, { timeout: 15_000 });
    await expect(adminPage.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
  });

  test('searches and finds institution', async ({ adminPage }) => {
    const fixtures = loadFixtures();
    await adminPage.goto('/institutions');
    await adminPage.waitForLoadState('networkidle');

    // Find a search input and type the institution name
    const searchInput = adminPage.getByRole('textbox').first();
    await searchInput.fill(fixtures.simpleInstitutionName);
    await adminPage.waitForTimeout(500);

    await expect(adminPage.getByText(fixtures.simpleInstitutionName)).toBeVisible({ timeout: 10_000 });
  });

  test('navigates into institution', async ({ adminPage }) => {
    const fixtures = loadFixtures();
    await adminPage.goto('/institutions');
    await adminPage.waitForLoadState('networkidle');

    await adminPage.getByText(fixtures.simpleInstitutionName).click();
    await adminPage.waitForURL(
      (url) => url.pathname.includes(`/institutions/${fixtures.simpleInstitutionId}`),
      { timeout: 10_000 }
    );
    expect(adminPage.url()).toContain(fixtures.simpleInstitutionId);
  });
});
