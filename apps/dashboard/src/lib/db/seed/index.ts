/* Seed orchestrator. Usage:
 *   pnpm seed:dev          — additive seed (idempotent for auth users only)
 *   pnpm seed:reset        — TRUNCATE everything then re-seed
 */
import { admin, sql, disconnect, logSection, logDone } from './_lib';
import { seedRbac } from './01-rbac';
import { seedDomain } from './02-domain';

const RESET = process.argv.includes('--reset');

async function reset(): Promise<void> {
  logSection('0. Reset: truncating all VaultFlow tables and demo auth users');

  // Truncate in FK-safe order (organizations cascades most of it, but be explicit)
  await sql`TRUNCATE
    notifications, audit_log, churn_events, mrr_snapshots,
    invoices, subscriptions, plans,
    fraud_signals, payment_methods, transactions,
    customers,
    resource_permissions, org_members, role_permissions, roles,
    user_profiles, organizations
    RESTART IDENTITY CASCADE`;
  logDone('Truncated all public tables');

  // Delete only the seeded auth users (anything @novapay.io / @orbitfinance.io / @streamlinehq.io)
  const sb = admin();
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);

  const seedDomains = ['@novapay.io', '@orbitfinance.io', '@streamlinehq.io'];
  let deleted = 0;
  for (const u of data.users) {
    if (u.email && seedDomains.some((d) => u.email!.endsWith(d))) {
      const { error: delErr } = await sb.auth.admin.deleteUser(u.id);
      if (delErr) console.warn(`  delete ${u.email}: ${delErr.message}`);
      else deleted++;
    }
  }
  logDone(`Deleted ${deleted} demo auth users`);
}

async function main(): Promise<void> {
  const t0 = Date.now();
  console.log('\n\x1b[1m╭───────────────────────────────────────────╮');
  console.log('│        VaultFlow Seed                     │');
  console.log(`│        ${RESET ? 'RESET + re-seed' : 'additive'}                         │`);
  console.log('╰───────────────────────────────────────────╯\x1b[0m');

  try {
    if (RESET) await reset();

    const rbac = await seedRbac();
    await seedDomain(rbac);

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n\x1b[32m✓ Seed complete in ${elapsed}s\x1b[0m`);
    console.log('\n  Demo login: alice@novapay.io  /  Demo@1234');
    console.log('  Other roles: bob/carol/dave/eve/frank/grace @novapay.io (same password)\n');
  } catch (err) {
    console.error('\n\x1b[31m✗ Seed failed:\x1b[0m', err);
    process.exitCode = 1;
  } finally {
    await disconnect();
  }
}

void main();
