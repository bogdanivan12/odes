import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

test.describe('Schedule View', () => {
  test('schedule view page loads', async ({ adminPage }) => {
    const fixtures = loadFixtures();
    const schedulesUrl = `/institutions/${fixtures.complexInstitutionId}/schedules`;

    await adminPage.goto(schedulesUrl);
    await adminPage.waitForLoadState('networkidle');

    // Find a completed schedule and click it
    const completedSchedule = adminPage
      .locator('[class*="MuiPaper"]')
      .filter({ has: adminPage.locator('[class*="MuiChip"]').filter({ hasText: 'completed' }) })
      .first();

    const scheduleCount = await completedSchedule.count();
    if (scheduleCount === 0) {
      test.skip(true, 'No completed schedule found — run generate.spec.ts first');
    }

    await completedSchedule.click();

    // URL should change to /schedules/:id
    await adminPage.waitForURL(/\/schedules\/[a-zA-Z0-9]+/, { timeout: 10_000 });
    expect(adminPage.url()).toMatch(/\/schedules\/[a-zA-Z0-9]+/);
  });

  test('calendar renders', async ({ adminPage }) => {
    const fixtures = loadFixtures();
    const schedulesUrl = `/institutions/${fixtures.complexInstitutionId}/schedules`;

    await adminPage.goto(schedulesUrl);
    await adminPage.waitForLoadState('networkidle');

    // Navigate to completed schedule
    const completedSchedule = adminPage
      .locator('[class*="MuiPaper"]')
      .filter({ has: adminPage.locator('[class*="MuiChip"]').filter({ hasText: 'completed' }) })
      .first();

    const scheduleCount = await completedSchedule.count();
    if (scheduleCount === 0) {
      test.skip(true, 'No completed schedule found — run generate.spec.ts first');
    }

    await completedSchedule.click();
    await adminPage.waitForURL(/\/schedules\/[a-zA-Z0-9]+/, { timeout: 10_000 });
    await adminPage.waitForLoadState('networkidle');

    // Assert that the schedule/calendar content is visible
    // Look for a grid or table structure
    const gridOrTable = adminPage
      .locator('table, [role="grid"], [class*="Grid"], [class*="Calendar"], [class*="Schedule"]')
      .first();
    await expect(gridOrTable).toBeVisible({ timeout: 15_000 });
  });
});
