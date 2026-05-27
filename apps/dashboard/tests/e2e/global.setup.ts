import { test as setup, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_ROLES, DEMO_USERS } from './fixtures/users';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '.auth');

setup('seed test database + capture auth state per role', async ({ browser }) => {
  await mkdir(AUTH_DIR, { recursive: true });

  // Reuse the seeded local Supabase. We assume `pnpm seed:dev` was run before tests.
  for (const role of ALL_ROLES) {
    const user = DEMO_USERS[role];
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto('/login');
    await page.getByTestId('login-email').fill(user.email);
    await page.getByTestId('login-password').fill(user.password);
    await Promise.all([
      page.waitForURL('**/dashboard', { timeout: 15_000 }),
      page.getByTestId('login-submit').click()
    ]);

    await expect(page.getByTestId('primary-nav')).toBeVisible();

    await ctx.storageState({ path: path.join(AUTH_DIR, `${role}.json`) });
    await ctx.close();
  }
});
