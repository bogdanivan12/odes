import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

test.describe('Groups CRUD', () => {
  test.beforeEach(async ({ adminPage }) => {
    const fixtures = loadFixtures();
    await adminPage.goto(`/institutions/${fixtures.simpleInstitutionId}/groups`);
    await adminPage.waitForLoadState('networkidle');
  });

  test('shows existing groups', async ({ adminPage }) => {
    await expect(adminPage.getByText('Group A')).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByText('Group B')).toBeVisible({ timeout: 10_000 });
  });

  test('creates a group', async ({ adminPage }) => {
    const groupName = `Test Group ${Date.now()}`;

    await adminPage.getByRole('button', { name: 'New group' }).click();

    await expect(adminPage.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Fill the group name field
    await adminPage.getByLabel('Group name').fill(groupName);
    await adminPage.getByRole('button', { name: 'Create' }).click();

    await expect(adminPage.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByText(groupName)).toBeVisible({ timeout: 10_000 });
  });

  test('deletes a group', async ({ adminPage }) => {
    // Create a group to delete
    const deleteName = `Delete Group ${Date.now()}`;

    await adminPage.getByRole('button', { name: 'New group' }).click();
    await adminPage.getByLabel('Group name').fill(deleteName);
    await adminPage.getByRole('button', { name: 'Create' }).click();
    await expect(adminPage.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByText(deleteName)).toBeVisible({ timeout: 10_000 });

    // Delete it
    const groupRow = adminPage.locator('li, [role="listitem"], [class*="MuiListItem"]').filter({ hasText: deleteName }).first();
    await groupRow.getByRole('button', { name: /delete/i }).click();

    await expect(adminPage.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await adminPage.getByRole('button', { name: 'Delete' }).click();

    await expect(adminPage.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByText(deleteName)).not.toBeVisible({ timeout: 10_000 });
  });
});
