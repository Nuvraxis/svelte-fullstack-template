import { test, expect } from '../fixtures/auth';
import type { Role } from '../fixtures/users';

/**
 * Each role should see a different set of nav items per CLAUDE.md §6.2.
 * Items are filtered at render time — locked items don't exist in the DOM.
 */
const EXPECTED_VISIBLE: Record<Role, string[]> = {
  super_admin: [
    'Overview', 'Transactions', 'Payments', 'Fraud Detection',
    'Customers', 'Subscriptions', 'Revenue',
    'Reports', 'Team', 'Audit Log', 'Settings'
  ],
  admin: [
    'Overview', 'Transactions', 'Payments', 'Fraud Detection',
    'Customers', 'Subscriptions', 'Revenue',
    'Reports', 'Team', 'Audit Log', 'Settings'
  ],
  finance_manager: [
    'Overview', 'Transactions', 'Payments', 'Fraud Detection',
    'Customers', 'Subscriptions', 'Revenue',
    'Reports', 'Settings'
  ],
  ops_manager: [
    'Overview', 'Transactions', 'Payments', 'Fraud Detection',
    'Customers', 'Settings'
  ],
  analyst: [
    'Overview', 'Transactions', 'Fraud Detection',
    'Customers', 'Subscriptions', 'Revenue',
    'Reports', 'Settings'
  ],
  viewer: [
    'Overview', 'Transactions',
    'Customers', 'Subscriptions',
    'Settings'
  ]
};

const EXPECTED_HIDDEN: Record<Role, string[]> = {
  super_admin:     [],
  admin:           [],
  finance_manager: ['Team', 'Audit Log'],
  ops_manager:     ['Subscriptions', 'Revenue', 'Reports', 'Team', 'Audit Log'],
  analyst:         ['Payments', 'Team', 'Audit Log'],
  viewer:          ['Fraud Detection', 'Payments', 'Revenue', 'Reports', 'Team', 'Audit Log']
};

for (const role of Object.keys(EXPECTED_VISIBLE) as Role[]) {
  test.describe(`nav as ${role}`, () => {
    test.use({ role });

    test('shows expected items', async ({ authedPage }) => {
      await authedPage.goto('/dashboard');
      const nav = authedPage.getByTestId('primary-nav');
      for (const label of EXPECTED_VISIBLE[role]) {
        await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
      }
    });

    test('hides forbidden items', async ({ authedPage }) => {
      await authedPage.goto('/dashboard');
      const nav = authedPage.getByTestId('primary-nav');
      for (const label of EXPECTED_HIDDEN[role]) {
        await expect(nav.getByRole('link', { name: label, exact: true })).toHaveCount(0);
      }
    });
  });
}
