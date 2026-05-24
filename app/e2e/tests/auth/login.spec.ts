import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { login } from '../../helpers/api';

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

test.describe('Login', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('rejects wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10_000 });
  });

  test('logs in successfully', async ({ page }) => {
    const fixtures = loadFixtures();
    await page.goto('/login');
    await page.getByLabel('Email address').fill(fixtures.adminEmail);
    await page.getByLabel('Password').fill(fixtures.adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/(institutions|$)/, { timeout: 15_000 });
    expect(page.url()).not.toContain('/login');
  });

  test('redirects authenticated user away from /login', async ({ page }) => {
    const fixtures = loadFixtures();
    const token = await login(fixtures.adminEmail, fixtures.adminPassword);

    // Set the token so the app thinks we're logged in
    await page.goto('/');
    await page.evaluate((accessToken: string) => {
      localStorage.setItem('accessToken', accessToken);
    }, token);

    // Now navigate to /login — should redirect away
    await page.goto('/login');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
    expect(page.url()).not.toContain('/login');
  });
});
