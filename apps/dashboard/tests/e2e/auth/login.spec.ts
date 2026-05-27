import { test, expect } from '@playwright/test';
import { DEMO_USERS } from '../fixtures/users';

test.describe('login', () => {
  test('renders login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/login');
    // HTML5 required prevents submit — disable to test server validation.
    await page.getByTestId('login-email').fill('not-an-email');
    await page.getByTestId('login-password').fill('short');
    await page.getByTestId('login-submit').click();
    await expect(page.getByText(/valid email|at least 8/i).first()).toBeVisible();
  });

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill('nobody@example.com');
    await page.getByTestId('login-password').fill('wrongpassword');
    await page.getByTestId('login-submit').click();
    await expect(page.getByRole('alert')).toContainText(/invalid email or password/i);
  });

  test('redirects to /dashboard after successful login', async ({ page }) => {
    const user = DEMO_USERS.admin;
    await page.goto('/login');
    await page.getByTestId('login-email').fill(user.email);
    await page.getByTestId('login-password').fill(user.password);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('logout clears session and redirects to /login', async ({ page }) => {
    const user = DEMO_USERS.admin;
    await page.goto('/login');
    await page.getByTestId('login-email').fill(user.email);
    await page.getByTestId('login-password').fill(user.password);
    await page.getByTestId('login-submit').click();
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');

    // Retry the menu-trigger click until hydration finishes binding the handler.
    await expect(async () => {
      await page.getByTestId('user-menu-trigger').click();
      await expect(page.getByTestId('logout-button')).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10_000 });
    await page.getByTestId('logout-button').click();
    await expect(page).toHaveURL(/\/login/);

    // Hitting a protected route should bounce back to login.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
