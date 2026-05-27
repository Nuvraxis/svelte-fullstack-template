import { test, expect } from '../fixtures/auth';

test.describe('action gating', () => {
  test('viewer cannot reach /audit-log — gets 403', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'tests/e2e/.auth/viewer.json'
    });
    const page = await ctx.newPage();
    await page.goto('/audit-log');
    await expect(page.getByText(/access to the audit log/i)).toBeVisible();
    await ctx.close();
  });

  test('analyst cannot reach /audit-log — gets 403', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'tests/e2e/.auth/analyst.json'
    });
    const page = await ctx.newPage();
    await page.goto('/audit-log');
    await expect(page.getByText(/access to the audit log/i)).toBeVisible();
    await ctx.close();
  });

  test('admin can reach /audit-log', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'tests/e2e/.auth/admin.json'
    });
    const page = await ctx.newPage();
    await page.goto('/audit-log');
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible();
    await ctx.close();
  });

  test('viewer cannot reach /transactions if perms strip read — but our viewer has read', async ({ browser }) => {
    // Per the role matrix viewer DOES have transactions:read. This test asserts
    // the positive case (they can reach the page).
    const ctx = await browser.newContext({
      storageState: 'tests/e2e/.auth/viewer.json'
    });
    const page = await ctx.newPage();
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();
    await ctx.close();
  });

  test('finance_manager sees the Team item in nav as absent (team:read denied)', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'tests/e2e/.auth/finance_manager.json'
    });
    const page = await ctx.newPage();
    await page.goto('/dashboard');
    const nav = page.getByTestId('primary-nav');
    await expect(nav.getByRole('link', { name: 'Team', exact: true })).toHaveCount(0);
    await ctx.close();
  });
});
