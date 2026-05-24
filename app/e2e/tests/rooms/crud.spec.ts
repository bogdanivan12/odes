import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

test.describe('Rooms CRUD', () => {
  test.beforeEach(async ({ adminPage }) => {
    const fixtures = loadFixtures();
    await adminPage.goto(`/institutions/${fixtures.simpleInstitutionId}/rooms`);
    await adminPage.waitForLoadState('networkidle');
  });

  test('shows existing rooms', async ({ adminPage }) => {
    await expect(adminPage.getByText('Lecture Hall 101')).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByText('Lab 201')).toBeVisible({ timeout: 10_000 });
  });

  test('creates a room', async ({ adminPage }) => {
    const roomName = `Test Room ${Date.now()}`;

    await adminPage.getByRole('button', { name: 'New room' }).click();

    await expect(adminPage.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Fill room name
    await adminPage.getByLabel('Room name').fill(roomName);

    // Fill capacity
    const capacityField = adminPage.getByLabel('Capacity');
    if (await capacityField.isVisible()) {
      await capacityField.fill('50');
    }

    await adminPage.getByRole('button', { name: 'Create' }).click();

    await expect(adminPage.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByText(roomName)).toBeVisible({ timeout: 10_000 });
  });
});
