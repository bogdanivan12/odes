import { test as base, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { login } from '../helpers/api';

interface Fixtures {
  adminPage: Page;
  professorPage: Page;
  studentPage: Page;
}

interface AuthFixturesData {
  adminEmail: string;
  adminPassword: string;
  professorEmail: string;
  professorPassword: string;
  studentEmail: string;
  studentPassword: string;
  [key: string]: unknown;
}

function loadFixtures(): AuthFixturesData {
  const fixturesPath = path.join(__dirname, '..', '.fixtures.json');
  const rawData: unknown = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));

  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Invalid fixtures format: expected an object');
  }

  const fixtures = rawData as Partial<AuthFixturesData>;
  const requiredFields: Array<
    keyof Pick<
      AuthFixturesData,
      | 'adminEmail'
      | 'adminPassword'
      | 'professorEmail'
      | 'professorPassword'
      | 'studentEmail'
      | 'studentPassword'
    >
  > = [
    'adminEmail',
    'adminPassword',
    'professorEmail',
    'professorPassword',
    'studentEmail',
    'studentPassword',
  ];

  for (const field of requiredFields) {
    if (typeof fixtures[field] !== 'string') {
      throw new Error(`Invalid fixtures format: expected "${field}" to be a string`);
    }
  }

  return fixtures as AuthFixturesData;
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
