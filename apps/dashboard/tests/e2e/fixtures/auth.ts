import { test as base, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Role } from './users';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '..', '.auth');

interface AuthFixtures {
  /** Role used for the test. Set per-test via test.use({ role: 'analyst' }). */
  role: Role;
  /** A page with the storageState for `role` already loaded. */
  authedPage: Page;
}

export const test = base.extend<AuthFixtures>({
  role: ['super_admin', { option: true }],

  authedPage: async ({ browser, role }, use) => {
    const ctx = await browser.newContext({
      storageState: path.join(AUTH_DIR, `${role}.json`)
    });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  }
});

export { expect } from '@playwright/test';
