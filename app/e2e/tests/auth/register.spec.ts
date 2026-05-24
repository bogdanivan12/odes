import { test, expect } from '@playwright/test';

test.describe('Register', () => {
  test('shows register form', async ({ page }) => {
    await page.goto('/register');
    // Look for heading or prominent text
    const heading = page.getByRole('heading').or(page.getByText('Create your account'));
    await expect(heading.first()).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
  });

  test('shows error on password mismatch', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Full name').fill('Test User');
    await page.getByLabel('Email address').fill(`test-mismatch-${Date.now()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByLabel('Confirm password').fill('DifferentPassword123!');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Passwords do not match')).toBeVisible({ timeout: 10_000 });
  });

  test('registers successfully', async ({ page }) => {
    const uniqueEmail = `e2e-newuser-${Date.now()}@test.odes`;
    await page.goto('/register');
    await page.getByLabel('Full name').fill('New E2E User');
    await page.getByLabel('Email address').fill(uniqueEmail);
    await page.getByLabel('Password', { exact: true }).fill('NewUser1234!');
    await page.getByLabel('Confirm password').fill('NewUser1234!');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Account created successfully!')).toBeVisible({ timeout: 15_000 });
  });
});
