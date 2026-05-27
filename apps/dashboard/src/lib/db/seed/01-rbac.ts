/* Phase 2 seed: organizations, roles, role-permission grants, demo users. */
import { admin, sql, faker, logSection, logDone } from './_lib';

type SystemRole =
  | 'super_admin'
  | 'admin'
  | 'finance_manager'
  | 'ops_manager'
  | 'analyst'
  | 'viewer';

/**
 * Permission matrix per CLAUDE.md §6.2.
 * Empty array = role has no permissions (e.g. role doesn't apply to that resource).
 */
const ROLE_PERMS: Record<SystemRole, Array<[string, string]>> = {
  super_admin: [], // filled in dynamically with every permission

  admin: [
    ['transactions', 'read'], ['transactions', 'create'], ['transactions', 'update'],
    ['transactions', 'delete'], ['transactions', 'export'], ['transactions', 'approve'],
    ['payments', 'read'], ['payments', 'create'],
    ['fraud', 'read'], ['fraud', 'resolve'],
    ['customers', 'read'], ['customers', 'create'], ['customers', 'update'], ['customers', 'delete'], ['customers', 'export'],
    ['subscriptions', 'read'], ['subscriptions', 'update'], ['subscriptions', 'create'],
    ['revenue', 'read'],
    ['reports', 'read'], ['reports', 'create'], ['reports', 'export'],
    ['team', 'read'], ['team', 'manage'],
    ['settings', 'read'], ['settings', 'update'],
    ['billing', 'read'],
    ['audit_log', 'read']
  ],

  finance_manager: [
    ['transactions', 'read'], ['transactions', 'create'], ['transactions', 'update'],
    ['transactions', 'export'], ['transactions', 'approve'],
    ['payments', 'read'],
    ['fraud', 'read'], ['fraud', 'resolve'],
    ['customers', 'read'], ['customers', 'create'], ['customers', 'update'],
    ['subscriptions', 'read'], ['subscriptions', 'update'],
    ['revenue', 'read'],
    ['reports', 'read'], ['reports', 'create'], ['reports', 'export'],
    ['billing', 'read']
  ],

  ops_manager: [
    ['transactions', 'read'], ['transactions', 'update'], ['transactions', 'approve'],
    ['payments', 'read'], ['payments', 'create'],
    ['fraud', 'read'], ['fraud', 'resolve'],
    ['customers', 'read'], ['customers', 'update']
  ],

  analyst: [
    ['transactions', 'read'], ['transactions', 'export'],
    ['fraud', 'read'],
    ['customers', 'read'],
    ['subscriptions', 'read'],
    ['revenue', 'read'],
    ['reports', 'read'], ['reports', 'export']
  ],

  viewer: [
    ['transactions', 'read'],
    ['customers', 'read'],
    ['subscriptions', 'read']
  ]
};

const ROLE_DISPLAY: Record<SystemRole, { name: string; desc: string }> = {
  super_admin:     { name: 'Super Admin',     desc: 'Full access. Cannot be deleted.' },
  admin:           { name: 'Admin',           desc: 'Full access except billing changes.' },
  finance_manager: { name: 'Finance Manager', desc: 'Manages transactions, customers, revenue.' },
  ops_manager:     { name: 'Ops Manager',     desc: 'Operates payments, fraud, customer ops.' },
  analyst:         { name: 'Analyst',         desc: 'Read-only with export.' },
  viewer:          { name: 'Viewer',          desc: 'Read-only.' }
};

interface SeededOrg {
  id: string;
  slug: string;
  roles: Record<SystemRole, string>;
}

export interface SeedRbacResult {
  novapay: SeededOrg;
  orbitfinance: SeededOrg;
  streamlinehq: SeededOrg;
  /** Maps email → user_id for downstream domain seeding (customers, audit log etc.) */
  userIds: Record<string, string>;
}

export async function seedRbac(): Promise<SeedRbacResult> {
  logSection('1. RBAC: orgs, roles, permissions, demo users');

  // ── Organizations ───────────────────────────────────────
  const orgs = await sql<{ id: string; slug: string }[]>`
    INSERT INTO organizations (name, slug, plan, mode) VALUES
      ('NovaPay',        'novapay',      'enterprise', 'both'),
      ('Orbit Finance',  'orbitfinance', 'growth',     'fintech'),
      ('Streamline HQ',  'streamlinehq', 'starter',    'saas')
    RETURNING id, slug
  `;
  logDone(`Created ${orgs.length} organizations`);

  const orgIdBySlug = Object.fromEntries(orgs.map((o) => [o.slug, o.id]));

  // ── System roles per org ────────────────────────────────
  const rolesBySlugAndName: Record<string, Record<SystemRole, string>> = {} as never;
  const allRoleNames = Object.keys(ROLE_DISPLAY) as SystemRole[];

  for (const org of orgs) {
    rolesBySlugAndName[org.slug] = {} as Record<SystemRole, string>;

    const values = allRoleNames.map(
      (name) => [org.id, name, ROLE_DISPLAY[name].name, ROLE_DISPLAY[name].desc, true] as const
    );
    const inserted = await sql<{ id: string; name: string }[]>`
      INSERT INTO roles ${sql(
        values.map(([org_id, name, display_name, description, is_system]) => ({
          org_id,
          name,
          display_name,
          description,
          is_system
        }))
      )}
      RETURNING id, name
    `;
    for (const row of inserted) {
      rolesBySlugAndName[org.slug]![row.name as SystemRole] = row.id;
    }
  }
  logDone(`Created ${allRoleNames.length} system roles × ${orgs.length} orgs`);

  // ── Permission catalog already seeded by migration. Map (resource,action) → id ──
  const permRows = await sql<{ id: string; resource: string; action: string }[]>`
    SELECT id, resource, action FROM permissions
  `;
  const permId = (resource: string, action: string): string => {
    const m = permRows.find((p) => p.resource === resource && p.action === action);
    if (!m) throw new Error(`Permission ${resource}:${action} not found in catalog`);
    return m.id;
  };

  // super_admin gets every permission
  ROLE_PERMS.super_admin = permRows.map((p) => [p.resource, p.action] as [string, string]);

  // ── Wire role_permissions ───────────────────────────────
  const rpRows: { role_id: string; permission_id: string }[] = [];
  for (const org of orgs) {
    for (const role of allRoleNames) {
      const roleId = rolesBySlugAndName[org.slug]![role];
      for (const [resource, action] of ROLE_PERMS[role]) {
        rpRows.push({ role_id: roleId, permission_id: permId(resource, action) });
      }
    }
  }
  if (rpRows.length) {
    await sql`INSERT INTO role_permissions ${sql(rpRows)}`;
  }
  logDone(`Wired ${rpRows.length} role-permission grants`);

  // ── Demo users (NovaPay only — other orgs stay un-membered for now) ─
  const DEMO_PASSWORD = 'Demo@1234';
  const novaId = orgIdBySlug.novapay!;

  const DEMO_USERS: Array<{ email: string; full_name: string; role: SystemRole }> = [
    { email: 'alice@novapay.io', full_name: 'Alice Anderson', role: 'super_admin' },
    { email: 'bob@novapay.io',   full_name: 'Bob Becker',     role: 'admin' },
    { email: 'carol@novapay.io', full_name: 'Carol Chen',     role: 'finance_manager' },
    { email: 'dave@novapay.io',  full_name: 'Dave Davis',     role: 'analyst' },
    { email: 'eve@novapay.io',   full_name: 'Eve Evans',      role: 'viewer' },
    { email: 'frank@novapay.io', full_name: 'Frank Foster',   role: 'ops_manager' },
    { email: 'grace@novapay.io', full_name: 'Grace Garcia',   role: 'analyst' } // RBAC override demo
  ];

  const userIds: Record<string, string> = {};
  const sb = admin();

  for (const u of DEMO_USERS) {
    // Idempotent: if the user already exists, look them up instead of erroring.
    const { data: existing } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let userId = existing.users.find((au) => au.email === u.email)?.id;

    if (!userId) {
      const { data, error } = await sb.auth.admin.createUser({
        email: u.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: u.full_name }
      });
      if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
      userId = data.user.id;
    }
    userIds[u.email] = userId;

    // user_profile
    await sql`
      INSERT INTO user_profiles (id, org_id, full_name, email, timezone)
      VALUES (${userId}, ${novaId}, ${u.full_name}, ${u.email}, 'UTC')
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email
    `;

    // org_member
    await sql`
      INSERT INTO org_members (org_id, user_id, role_id, status, joined_at)
      VALUES (${novaId}, ${userId}, ${rolesBySlugAndName.novapay![u.role]}, 'active', NOW() - INTERVAL '90 days')
      ON CONFLICT (org_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id, status = 'active'
    `;
  }
  logDone(`Created ${DEMO_USERS.length} demo users in NovaPay (password: ${DEMO_PASSWORD})`);

  // ── Grace's per-resource override: she's an analyst, but explicitly granted transactions:export ──
  // (The CLAUDE.md spec describes a report-id-scoped grant — we model the same idea by giving her
  //  a global-scope explicit grant that other analysts don't have, so the UI can demo "this one
  //  analyst can export". The demo script switches to her tab to show the export button appearing.)
  await sql`
    INSERT INTO resource_permissions (org_id, user_id, resource, action, granted, granted_by, expires_at)
    VALUES (
      ${novaId},
      ${userIds['grace@novapay.io']},
      'transactions',
      'export',
      TRUE,
      ${userIds['alice@novapay.io']},
      NOW() + INTERVAL '90 days'
    )
    ON CONFLICT (org_id, user_id, resource, resource_id, action) DO NOTHING
  `;
  logDone('Granted grace@novapay.io a per-resource transactions:export override');

  return {
    novapay:      { id: orgIdBySlug.novapay!,      slug: 'novapay',      roles: rolesBySlugAndName.novapay! },
    orbitfinance: { id: orgIdBySlug.orbitfinance!, slug: 'orbitfinance', roles: rolesBySlugAndName.orbitfinance! },
    streamlinehq: { id: orgIdBySlug.streamlinehq!, slug: 'streamlinehq', roles: rolesBySlugAndName.streamlinehq! },
    userIds
  };

  // (Unused param — silence linter; faker is used in other seed modules)
  void faker;
}
