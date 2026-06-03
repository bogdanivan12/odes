import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth.fixture';
import * as fs from 'fs';
import * as path from 'path';

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

test.describe('My Schedule', () => {
  test('my schedule page loads', async ({ studentPage }) => {
    await studentPage.goto('/my-schedule');
    await studentPage.waitForLoadState('networkidle');

    // Page should have some visible content (header or schedule area)
    const pageContent = studentPage
      .getByRole('heading')
      .or(studentPage.getByText(/my schedule/i))
      .or(studentPage.locator('main'))
      .first();
    await expect(pageContent).toBeVisible({ timeout: 10_000 });
  });

  test('shows schedule content or no-schedule state', async ({ studentPage }) => {
    await studentPage.goto('/my-schedule');
    await studentPage.waitForLoadState('networkidle');

    // The page always shows one of these two states:
    //   (a) a schedule calendar when there is an active schedule, OR
    //   (b) a "No active schedules" message when none exist yet
    // Institution filter chips only appear when the student belongs to
    // multiple institutions with active schedules - not a reliable CI invariant.
    const content = studentPage
      .getByText('No active schedules')
      .or(studentPage.getByText('None of your institutions have an active schedule'))
      .or(studentPage.getByText('You are not a member of any institution yet'))
      .or(studentPage.locator('[class*="CalendarGrid"], table, [role="grid"]'))
      .first();

    await expect(content).toBeVisible({ timeout: 15_000 });
  });
});
