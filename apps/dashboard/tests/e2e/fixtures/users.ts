/**
 * Demo users seeded into the NovaPay org for E2E tests.
 * Mirrors the table in CLAUDE.md §8.3.
 */
export type Role =
  | 'super_admin'
  | 'admin'
  | 'finance_manager'
  | 'ops_manager'
  | 'analyst'
  | 'viewer';

export interface DemoUser {
  email: string;
  password: string;
  role: Role;
  full_name: string;
}

export const DEMO_PASSWORD = 'Demo@1234';

export const DEMO_USERS: Record<Role, DemoUser> = {
  super_admin: {
    email: 'alice@novapay.io',
    password: DEMO_PASSWORD,
    role: 'super_admin',
    full_name: 'Alice Anderson'
  },
  admin: {
    email: 'bob@novapay.io',
    password: DEMO_PASSWORD,
    role: 'admin',
    full_name: 'Bob Becker'
  },
  finance_manager: {
    email: 'carol@novapay.io',
    password: DEMO_PASSWORD,
    role: 'finance_manager',
    full_name: 'Carol Chen'
  },
  analyst: {
    email: 'dave@novapay.io',
    password: DEMO_PASSWORD,
    role: 'analyst',
    full_name: 'Dave Davis'
  },
  viewer: {
    email: 'eve@novapay.io',
    password: DEMO_PASSWORD,
    role: 'viewer',
    full_name: 'Eve Evans'
  },
  ops_manager: {
    email: 'frank@novapay.io',
    password: DEMO_PASSWORD,
    role: 'ops_manager',
    full_name: 'Frank Foster'
  }
};

export const ALL_ROLES: Role[] = [
  'super_admin',
  'admin',
  'finance_manager',
  'ops_manager',
  'analyst',
  'viewer'
];
