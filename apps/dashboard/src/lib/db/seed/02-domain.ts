/* Phase 2 seed: customers, plans, subscriptions, invoices, transactions,
 * fraud signals, MRR snapshots, churn events, payment methods. */
import { faker, sql, pickWeighted, logNormal, rng, daysAgo, logSection, logDone, pad } from './_lib';
import type { SeedRbacResult } from './01-rbac';

const COUNTRIES = ['US', 'US', 'US', 'US', 'GB', 'GB', 'DE', 'FR', 'NL', 'CA', 'AU', 'BR', 'JP', 'SG', 'IN'];
const CURRENCIES_W = [
  { value: 'USD', weight: 70 },
  { value: 'EUR', weight: 15 },
  { value: 'GBP', weight: 10 },
  { value: 'CAD', weight: 3 },
  { value: 'AUD', weight: 2 }
];

interface Plan { id: string; org_id: string; name: string; amount: number; interval: 'monthly' | 'annual' }
interface Customer { id: string; org_id: string; email: string; created_at: Date; status: string }

export async function seedDomain(rbac: SeedRbacResult): Promise<void> {
  // NovaPay carries the bulk of demo data; smaller orgs get a smaller spread.
  await seedOrgDomain(rbac.novapay.id,      { customers: 500, transactions: 2_000, fraudSignals: 150, churnEvents: 120, mrrDays: 365, label: 'NovaPay' });
  await seedOrgDomain(rbac.orbitfinance.id, { customers: 120, transactions:   600, fraudSignals:  40, churnEvents:   0, mrrDays:   0, label: 'Orbit Finance' });
  await seedOrgDomain(rbac.streamlinehq.id, { customers: 200, transactions:   200, fraudSignals:   0, churnEvents:  40, mrrDays: 180, label: 'Streamline HQ' });
  await seedNotifications(rbac);
}

async function seedNotifications(rbac: SeedRbacResult): Promise<void> {
  logSection('Notifications');
  const orgId = rbac.novapay.id;
  const recipients = [
    rbac.userIds['alice@novapay.io'],
    rbac.userIds['bob@novapay.io'],
    rbac.userIds['carol@novapay.io'],
    rbac.userIds['frank@novapay.io']
  ].filter(Boolean) as string[];

  const TEMPLATES: Array<{ type: string; title: string; body: string }> = [
    { type: 'fraud_alert',    title: 'High-severity fraud signal',     body: 'A velocity anomaly was detected on transaction TXN-2026-00482.' },
    { type: 'fraud_alert',    title: 'Card mismatch flagged',          body: 'Geo and device fingerprint diverged on a $4,200 charge.' },
    { type: 'payment_failed', title: 'Subscription payment failed',    body: 'Customer Globex (acme-pay) failed its renewal at $1,499.' },
    { type: 'payment_failed', title: '3 invoices overdue',             body: 'Past-due balance has crossed $12k across 3 invoices.' },
    { type: 'churn_risk',     title: 'Churn risk: Vandelay Industries',body: 'Risk score climbed to 84 — usage dropped 40% week-over-week.' },
    { type: 'churn_risk',     title: 'Trial expiring tomorrow',        body: '4 trials end in 24h with no payment method on file.' },
    { type: 'invite',         title: 'New invite accepted',            body: 'Grace Hopper joined NovaPay as analyst.' },
    { type: 'report',         title: 'Monthly summary ready',          body: 'Your April monthly summary report is available to download.' }
  ];

  const rows: Array<Record<string, unknown>> = [];
  for (const userId of recipients) {
    for (let i = 0; i < TEMPLATES.length; i++) {
      const t = TEMPLATES[i]!;
      const ageHours = (i * 6) + faker.number.int({ min: 0, max: 12 });
      const createdAt = new Date(Date.now() - ageHours * 3600 * 1000);
      const isRead = ageHours > 30;
      rows.push({
        org_id: orgId,
        user_id: userId,
        type: t.type,
        title: t.title,
        body: t.body,
        data: JSON.stringify({}),
        read: isRead,
        read_at: isRead ? new Date(createdAt.getTime() + 30 * 60 * 1000) : null,
        created_at: createdAt
      });
    }
  }

  if (rows.length) {
    await sql`INSERT INTO notifications ${sql(rows)}`;
    logDone(`${rows.length} notifications (${recipients.length} recipients × ${TEMPLATES.length})`);
  }
}

interface OrgScale {
  customers: number;
  transactions: number;
  fraudSignals: number;
  churnEvents: number;
  mrrDays: number;
  label: string;
}

// Module-scoped so invoice/txn numbers stay unique across all orgs.
let GLOBAL_INVOICE_COUNTER = 0;
let GLOBAL_TX_COUNTER = 0;

async function seedOrgDomain(orgId: string, scale: OrgScale): Promise<void> {
  logSection(`2. Domain data: ${scale.label}`);

  // ── Plans ──────────────────────────────────────────────
  const planRows = [
    { name: 'Starter',    slug: 'starter',    amount: 49,    interval: 'monthly' },
    { name: 'Growth',     slug: 'growth',     amount: 199,   interval: 'monthly' },
    { name: 'Scale',      slug: 'scale',      amount: 599,   interval: 'monthly' },
    { name: 'Enterprise', slug: 'enterprise', amount: 1_499, interval: 'monthly' }
  ];
  const plans = await sql<Plan[]>`
    INSERT INTO plans ${sql(
      planRows.map((p) => ({
        org_id: orgId, name: p.name, slug: p.slug, amount: p.amount,
        currency: 'USD', interval: p.interval, trial_days: p.slug === 'starter' ? 14 : 0
      }))
    )}
    RETURNING id, org_id, name, amount, interval
  `;
  logDone(`${plans.length} plans`);

  // ── Customers (500) ────────────────────────────────────
  const customerRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < scale.customers; i++) {
    const firstName = faker.person.firstName();
    const lastName  = faker.person.lastName();
    const company   = faker.company.name();
    const country   = faker.helpers.arrayElement(COUNTRIES);
    const status    = pickWeighted([
      { value: 'active',  weight: 78 },
      { value: 'churned', weight: 12 },
      { value: 'trial',   weight: 6 },
      { value: 'paused',  weight: 4 }
    ]);
    const created = daysAgo(rng(1, 540));

    // LTV beta-ish (median around 1000–6000, long tail)
    const ltv = logNormal(2500, 1.2, 0, 200_000);
    const mrr = status === 'active' ? logNormal(180, 0.9, 0, 5000) : 0;
    const risk = faker.number.float({ min: 5, max: 95, fractionDigits: 2 });

    customerRows.push({
      org_id: orgId,
      external_id: `cust_${pad(i + 1, 5)}`,
      email: `${firstName}.${lastName}.${i}@${faker.internet.domainName()}`.toLowerCase(),
      full_name: `${firstName} ${lastName}`,
      company,
      country_code: country,
      ltv,
      mrr,
      status,
      risk_score: status === 'churned' ? Math.max(60, risk) : risk,
      created_at: created,
      updated_at: created
    });
  }
  // Insert in chunks to avoid query-size issues
  const customers: Customer[] = [];
  for (let i = 0; i < customerRows.length; i += 200) {
    const chunk = customerRows.slice(i, i + 200);
    const inserted = await sql<Customer[]>`
      INSERT INTO customers ${sql(chunk)}
      RETURNING id, org_id, email, created_at, status
    `;
    customers.push(...inserted);
  }
  logDone(`${customers.length} customers`);

  // ── Subscriptions for ~80% of active+trial customers ──
  const eligible = customers.filter((c) => c.status === 'active' || c.status === 'trial');
  const subscribers = faker.helpers.arrayElements(eligible, Math.floor(eligible.length * 0.8));

  const subRows: Array<Record<string, unknown>> = [];
  for (const c of subscribers) {
    const plan = faker.helpers.arrayElement(plans);
    const periodStart = daysAgo(rng(0, 28));
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    subRows.push({
      org_id: c.org_id,
      customer_id: c.id,
      plan_id: plan.id,
      status: c.status === 'trial' ? 'trialing' : 'active',
      current_period_start: periodStart,
      current_period_end: periodEnd,
      trial_end: c.status === 'trial' ? new Date(Date.now() + 5 * 86400_000) : null,
      mrr: plan.amount,
      created_at: c.created_at
    });
  }
  const subs: { id: string; customer_id: string; mrr: number }[] = [];
  for (let i = 0; i < subRows.length; i += 200) {
    const inserted = await sql<{ id: string; customer_id: string; mrr: number }[]>`
      INSERT INTO subscriptions ${sql(subRows.slice(i, i + 200))}
      RETURNING id, customer_id, mrr
    `;
    subs.push(...inserted);
  }
  logDone(`${subs.length} subscriptions`);

  // ── Invoices (~3 per subscription, plus one-offs) ─────
  const invoiceRows: Array<Record<string, unknown>> = [];
  for (const sub of subs) {
    const n = rng(1, 4);
    for (let i = 0; i < n; i++) {
      const status = pickWeighted([
        { value: 'paid', weight: 88 },
        { value: 'open', weight: 8 },
        { value: 'void', weight: 2 },
        { value: 'uncollectible', weight: 2 }
      ]);
      invoiceRows.push({
        org_id: orgId,
        customer_id: sub.customer_id,
        subscription_id: sub.id,
        number: `INV-${new Date().getFullYear()}-${pad(++GLOBAL_INVOICE_COUNTER, 6)}`,
        status,
        amount_due: sub.mrr,
        amount_paid: status === 'paid' ? sub.mrr : 0,
        currency: 'USD',
        due_date: daysAgo(rng(0, 90)),
        paid_at: status === 'paid' ? daysAgo(rng(0, 90)) : null,
        line_items: JSON.stringify([{ description: 'Subscription', amount: sub.mrr, quantity: 1 }])
      });
    }
  }
  for (let i = 0; i < invoiceRows.length; i += 200) {
    await sql`INSERT INTO invoices ${sql(invoiceRows.slice(i, i + 200))}`;
  }
  logDone(`${invoiceRows.length} invoices`);

  // ── Transactions ──────────────────────────────────────
  const txRows: Array<Record<string, unknown>> = [];
  const txDayWindow = 365;
  for (let i = 0; i < scale.transactions; i++) {
    // Distribute over a year, biased toward recent (~exponential)
    const dayOffset = Math.floor(txDayWindow * (1 - Math.pow(faker.number.float({ min: 0, max: 1 }), 0.6)));
    const created = daysAgo(dayOffset);

    const type = pickWeighted([
      { value: 'payment',    weight: 60 },
      { value: 'payout',     weight: 20 },
      { value: 'refund',     weight: 10 },
      { value: 'fee',        weight: 5 },
      { value: 'adjustment', weight: 5 }
    ]);
    const status = pickWeighted([
      { value: 'completed',  weight: 85 },
      { value: 'pending',    weight: 5 },
      { value: 'failed',     weight: 5 },
      { value: 'processing', weight: 4 },
      { value: 'flagged',    weight: 1 }
    ]);
    const currency = pickWeighted(CURRENCIES_W);
    const amount = logNormal(180, 1.6, 5, 250_000);
    const fee = Math.round(amount * 0.029 * 100) / 100;
    const channel = pickWeighted([
      { value: 'web',    weight: 55 },
      { value: 'api',    weight: 30 },
      { value: 'mobile', weight: 10 },
      { value: 'pos',    weight: 5 }
    ]);
    const customer = faker.helpers.arrayElement(customers);

    txRows.push({
      org_id: orgId,
      reference: `TXN-${new Date().getFullYear()}-${pad(++GLOBAL_TX_COUNTER, 6)}`,
      type,
      status,
      amount,
      currency,
      fee_amount: type === 'fee' ? amount : fee,
      customer_id: customer.id,
      payment_method: faker.helpers.arrayElement(['card', 'card', 'card', 'bank_transfer', 'wallet', 'crypto']),
      channel,
      country_code: customer.org_id === orgId ? faker.helpers.arrayElement(COUNTRIES) : 'US',
      metadata: '{}',
      flagged_reason: status === 'flagged' ? faker.helpers.arrayElement(['velocity', 'geo_mismatch', 'amount_anomaly']) : null,
      processed_at: status === 'completed' ? created : null,
      created_at: created
    });
  }
  const insertedTx: { id: string; status: string; org_id: string }[] = [];
  for (let i = 0; i < txRows.length; i += 250) {
    const inserted = await sql<{ id: string; status: string; org_id: string }[]>`
      INSERT INTO transactions ${sql(txRows.slice(i, i + 250))}
      RETURNING id, status, org_id
    `;
    insertedTx.push(...inserted);
  }
  logDone(`${insertedTx.length} transactions`);

  // ── Fraud signals (mostly tied to flagged + failed txns) ──
  const flagged = insertedTx.filter((t) => t.status === 'flagged' || t.status === 'failed');
  const fraudTargets = scale.fraudSignals > 0
    ? faker.helpers.arrayElements(
        flagged.length >= scale.fraudSignals ? flagged : insertedTx,
        Math.min(scale.fraudSignals, insertedTx.length)
      )
    : [];
  const fraudRows: Array<Record<string, unknown>> = fraudTargets.map((t) => {
    const severity = pickWeighted([
      { value: 'low',      weight: 30 },
      { value: 'medium',   weight: 40 },
      { value: 'high',     weight: 20 },
      { value: 'critical', weight: 10 }
    ]);
    return {
      org_id: orgId,
      transaction_id: t.id,
      signal_type: faker.helpers.arrayElement(['velocity', 'geo_mismatch', 'device_mismatch', 'amount_anomaly', 'blacklist']),
      severity,
      score: faker.number.float({ min: 30, max: 99, fractionDigits: 2 }),
      details: JSON.stringify({ matched_rules: faker.number.int({ min: 1, max: 5 }) }),
      resolved: faker.number.float({ min: 0, max: 1 }) > 0.6,
      created_at: daysAgo(rng(0, 60))
    };
  });
  if (fraudRows.length) {
    await sql`INSERT INTO fraud_signals ${sql(fraudRows)}`;
    logDone(`${fraudRows.length} fraud signals`);
  }

  // ── MRR snapshots (daily, 365 days) ───────────────────
  if (scale.mrrDays > 0) {
    const startMrr = 84_500;
    const endMrr   = 187_300;
    const snapRows: Array<Record<string, unknown>> = [];
    for (let d = scale.mrrDays - 1; d >= 0; d--) {
      const t = (scale.mrrDays - 1 - d) / (scale.mrrDays - 1);
      // S-curve growth with seasonal dip in Jan + Aug
      const seasonal = 1 + 0.04 * Math.sin((t * 2 * Math.PI * 365) / 30);
      const mrr = startMrr + (endMrr - startMrr) * t * seasonal;
      const newMrr = faker.number.float({ min: 800, max: 3_500, fractionDigits: 2 });
      const expansion = faker.number.float({ min: 200, max: 1_400, fractionDigits: 2 });
      const churned = faker.number.float({ min: 100, max: 1_800, fractionDigits: 2 });
      const contraction = faker.number.float({ min: 50, max: 600, fractionDigits: 2 });
      const reactivation = faker.number.float({ min: 0, max: 200, fractionDigits: 2 });
      snapRows.push({
        org_id: orgId,
        snapshot_date: daysAgo(d),
        mrr: Math.round(mrr * 100) / 100,
        new_mrr: newMrr,
        expansion_mrr: expansion,
        contraction_mrr: contraction,
        churned_mrr: churned,
        reactivation_mrr: reactivation,
        total_customers: Math.floor(300 + 200 * t + faker.number.int({ min: -10, max: 10 })),
        active_subscriptions: Math.floor(280 + 180 * t + faker.number.int({ min: -8, max: 8 }))
      });
    }
    for (let i = 0; i < snapRows.length; i += 100) {
      await sql`INSERT INTO mrr_snapshots ${sql(snapRows.slice(i, i + 100))}`;
    }
    logDone(`${snapRows.length} MRR snapshots`);
  }

  // ── Churn events ──────────────────────────────────────
  if (scale.churnEvents > 0) {
    const churned = customers.filter((c) => c.status === 'churned');
    const targets = faker.helpers.arrayElements(churned, Math.min(scale.churnEvents, churned.length));
    const reasons = ['price', 'missing_feature', 'competitor', 'budget', 'no_reason'];
    const churnRows = targets.map((c) => ({
      org_id: orgId,
      customer_id: c.id,
      reason: faker.helpers.arrayElement(reasons),
      mrr_lost: faker.number.float({ min: 49, max: 999, fractionDigits: 2 }),
      churned_at: daysAgo(rng(1, 180))
    }));
    if (churnRows.length) {
      await sql`INSERT INTO churn_events ${sql(churnRows)}`;
      logDone(`${churnRows.length} churn events`);
    }
  }
}
