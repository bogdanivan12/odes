import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

test.describe('Courses CRUD', () => {
  let createdCourseName: string;

  test.beforeEach(async ({ adminPage }) => {
    const fixtures = loadFixtures();
    await adminPage.goto(`/institutions/${fixtures.simpleInstitutionId}/courses`);
    await adminPage.waitForLoadState('networkidle');
  });

  test('shows existing courses', async ({ adminPage }) => {
    await expect(adminPage.getByText('Mathematics')).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByText('Computer Science')).toBeVisible({ timeout: 10_000 });
  });

  test('creates a course', async ({ adminPage }) => {
    createdCourseName = `Test Course ${Date.now()}`;
    await adminPage.getByRole('button', { name: 'New course' }).click();

    // Dialog should appear
    await expect(adminPage.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByRole('heading', { name: 'New course' })).toBeVisible();

    await adminPage.getByLabel('Course name').fill(createdCourseName);
    await adminPage.getByRole('button', { name: 'Create' }).click();

    // Dialog should close and new course visible
    await expect(adminPage.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByText(createdCourseName)).toBeVisible({ timeout: 10_000 });
  });

  test('edits a course', async ({ adminPage }) => {
    // First create a course to edit
    const originalName = `Edit Me ${Date.now()}`;
    const updatedName = `Edited ${Date.now()}`;

    await adminPage.getByRole('button', { name: 'New course' }).click();
    await adminPage.getByLabel('Course name').fill(originalName);
    await adminPage.getByRole('button', { name: 'Create' }).click();
    await expect(adminPage.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByText(originalName)).toBeVisible({ timeout: 10_000 });

    // Find the course card (Paper) and click its first action button (Edit)
    const courseRow = adminPage.locator('[class*="MuiPaper"]').filter({ hasText: originalName }).first();
    await courseRow.locator('button').first().click();

    // Edit dialog
    await expect(adminPage.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByRole('heading', { name: 'Edit course' })).toBeVisible();

    const nameInput = adminPage.getByLabel('Course name');
    await nameInput.clear();
    await nameInput.fill(updatedName);
    await adminPage.getByRole('button', { name: 'Save' }).click();

    await expect(adminPage.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByText(updatedName)).toBeVisible({ timeout: 10_000 });
  });

  test('deletes a course', async ({ adminPage }) => {
    // Create a course to delete
    const deleteName = `Delete Me ${Date.now()}`;

    await adminPage.getByRole('button', { name: 'New course' }).click();
    await adminPage.getByLabel('Course name').fill(deleteName);
    await adminPage.getByRole('button', { name: 'Create' }).click();
    await expect(adminPage.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByText(deleteName)).toBeVisible({ timeout: 10_000 });

    // Find the course card (Paper) and click its last action button (Delete)
    const courseRow = adminPage.locator('[class*="MuiPaper"]').filter({ hasText: deleteName }).first();
    await courseRow.locator('button').last().click();

    // Confirm dialog
    await expect(adminPage.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByRole('heading', { name: 'Delete course?' })).toBeVisible();
    await adminPage.getByRole('button', { name: 'Delete' }).click();

    await expect(adminPage.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByText(deleteName)).not.toBeVisible({ timeout: 10_000 });
  });
});
