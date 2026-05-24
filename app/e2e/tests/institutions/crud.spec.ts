import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture';
import { apiCall, login } from '../../helpers/api';
import * as fs from 'fs';
import * as path from 'path';

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

test.describe('Institutions CRUD', () => {
  // The test body includes browser navigation + API cleanup which adds up to
  // well over the default 30 s global timeout.  Set an explicit budget here.
  test.setTimeout(90_000);

  test('creates an institution', async ({ adminPage }) => {
    const uniqueName = 'E2E CRUD Institution';
    const fixtures = loadFixtures();
    await adminPage.goto('/institutions');
    await adminPage.getByRole('button', { name: 'New institution' }).click();
    await adminPage.waitForURL(/\/institutions\/new/, { timeout: 10_000 });

    await adminPage.getByLabel('Institution name').fill(uniqueName);
    // Week rotation field
    await adminPage.getByLabel('Week rotation').fill('2');
    await adminPage.getByRole('button', { name: 'Create institution' }).click();

    // Should redirect to institutions list and show the new institution.
    // Use .first() because the name can also appear in the app-bar institution picker.
    await adminPage.waitForURL(/\/institutions$/, { timeout: 15_000 });
    await expect(adminPage.getByText(uniqueName).first()).toBeVisible({ timeout: 10_000 });

    // Fetch the institution list via the API to find the newly created ID without
    // an extra browser navigation (avoids burning time on URL-change waits).
    const adminToken = await login(fixtures.adminEmail, fixtures.adminPassword);
    const data = await apiCall('GET', '/api/v1/institutions', undefined, adminToken) as {
      institutions: Array<{ _id: string; name: string }>;
    };
    const created = data.institutions.find((i) => i.name === uniqueName);
    expect(created).toBeTruthy();
    if (!created) throw new Error('Created institution not found in list');

    await apiCall('DELETE', `/api/v1/institutions/${created._id}`, undefined, adminToken);
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
