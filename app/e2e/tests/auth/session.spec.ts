import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { login } from '../../helpers/api';

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

test.describe('Session', () => {
  test('session persists after page reload', async ({ page }) => {
    const fixtures = loadFixtures();
    const token = await login(fixtures.adminEmail, fixtures.adminPassword);

    await page.goto('/');
    await page.evaluate((accessToken: string) => {
      localStorage.setItem('accessToken', accessToken);
    }, token);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on a protected page, not /login
    expect(page.url()).not.toContain('/login');
  });

  test('cleared access token redirects to login', async ({ page }) => {
    const fixtures = loadFixtures();
    const token = await login(fixtures.adminEmail, fixtures.adminPassword);

    await page.goto('/');
    await page.evaluate((accessToken: string) => {
      localStorage.setItem('accessToken', accessToken);
    }, token);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Clear the token
    await page.evaluate(() => {
      localStorage.removeItem('accessToken');
    });

    // Navigate to a protected route
    await page.goto('/institutions');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });
});
