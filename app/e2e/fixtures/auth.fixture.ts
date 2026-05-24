import { test as base, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { login } from '../helpers/api';

interface Fixtures {
  adminPage: Page;
  professorPage: Page;
  studentPage: Page;
}

function loadFixtures(): Record<string, string> {
  const fixturesPath = path.join(__dirname, '..', '.fixtures.json');
  return JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
}

async function loginAndInjectToken(page: Page, email: string, password: string): Promise<Page> {
  const token = await login(email, password);

  // Navigate to the app so we can set localStorage on the right origin
  await page.goto('/');
  await page.evaluate((accessToken: string) => {
    localStorage.setItem('accessToken', accessToken);
  }, token);

  // Navigate again so the app picks up the token
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  return page;
}

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const fixtures = loadFixtures();
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAndInjectToken(page, fixtures.adminEmail, fixtures.adminPassword);
    await use(page);
    await context.close();
  },

  professorPage: async ({ browser }, use) => {
    const fixtures = loadFixtures();
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAndInjectToken(page, fixtures.professorEmail, fixtures.professorPassword);
    await use(page);
    await context.close();
  },

  studentPage: async ({ browser }, use) => {
    const fixtures = loadFixtures();
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAndInjectToken(page, fixtures.studentEmail, fixtures.studentPassword);
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
