import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const RANGES: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12m': 365
};

export const load: PageServerLoad = async ({ parent, url, locals }) => {
  const { permissions, org } = await parent();
  if (!permissions || !permissions['revenue:read']) {
    error(403, { message: 'You do not have access to revenue analytics.' });
  }
  if (!org) error(403, { message: 'No active organization.' });

  const rangeKey = url.searchParams.get('range') ?? '90d';
  const days = RANGES[rangeKey] ?? RANGES['90d']!;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString().slice(0, 10);

  const { data: snapshots, error: sErr } = await locals.supabase
    .from('mrr_snapshots')
    .select('snapshot_date, mrr, new_mrr, expansion_mrr, contraction_mrr, churned_mrr, reactivation_mrr, total_customers, active_subscriptions')
    .eq('org_id', org.org_id)
    .gte('snapshot_date', sinceIso)
    .order('snapshot_date', { ascending: true });

  if (sErr) {
    console.error('[revenue] snapshots failed', sErr);
    error(500, { message: 'Failed to load revenue analytics.' });
  }

  // Churn reasons (last `days`)
  const { data: churn } = await locals.supabase
    .from('churn_events')
    .select('reason, mrr_lost')
    .eq('org_id', org.org_id)
    .gte('churned_at', sinceIso);

  const churnByReason = (churn ?? []).reduce<Record<string, { count: number; mrr_lost: number }>>(
    (acc, c) => {
      const reason = (c as { reason: string | null }).reason ?? 'no_reason';
      if (!acc[reason]) acc[reason] = { count: 0, mrr_lost: 0 };
      acc[reason].count++;
      acc[reason].mrr_lost += Number((c as { mrr_lost: number | null }).mrr_lost ?? 0);
      return acc;
    },
    {}
  );

  // Revenue by plan (active + trialing)
  const { data: byPlan } = await locals.supabase
    .from('subscriptions')
    .select('mrr, plans!inner(name)')
    .eq('org_id', org.org_id)
    .in('status', ['active', 'trialing']);
  const planRevenue = (byPlan ?? []).reduce<Record<string, number>>((acc, s) => {
    const rec = s as unknown as { mrr: number; plans: { name: string } };
    acc[rec.plans.name] = (acc[rec.plans.name] ?? 0) + Number(rec.mrr ?? 0);
    return acc;
  }, {});

  // Cohort retention — last 12 months × 12 months retention matrix
  const cohorts = await buildCohorts(locals.supabase, org.org_id);

  return {
    snapshots: snapshots ?? [],
    range: rangeKey,
    churnByReason,
    planRevenue,
    cohorts
  };
};

export interface CohortRow {
  label: string;        // 'Jun 25'
  monthKey: string;     // '2025-06'
  size: number;
  retention: (number | null)[]; // length 12 — null for future months
}

async function buildCohorts(
  supabase: App.Locals['supabase'],
  orgId: string
): Promise<CohortRow[]> {
  const now = new Date();
  const cohortStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const cohortStartIso = cohortStart.toISOString();

  const [{ data: cust }, { data: churn }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, created_at')
      .eq('org_id', orgId)
      .gte('created_at', cohortStartIso),
    supabase
      .from('churn_events')
      .select('customer_id, churned_at')
      .eq('org_id', orgId)
  ]);

  const churnByCustomer = new Map<string, Date>();
  for (const c of (churn ?? []) as Array<{ customer_id: string | null; churned_at: string }>) {
    if (c.customer_id) churnByCustomer.set(c.customer_id, new Date(c.churned_at));
  }

  const cohorts = new Map<string, CohortRow>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(cohortStart);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    cohorts.set(key, {
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      monthKey: key,
      size: 0,
      retention: Array.from({ length: 12 }, () => null)
    });
  }

  const members = new Map<string, Array<{ churned: Date | null }>>();
  for (const c of (cust ?? []) as Array<{ id: string; created_at: string }>) {
    const created = new Date(c.created_at);
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
    if (!cohorts.has(key)) continue;
    if (!members.has(key)) members.set(key, []);
    members.get(key)!.push({ churned: churnByCustomer.get(c.id) ?? null });
  }

  for (const [key, ms] of members.entries()) {
    const cohort = cohorts.get(key)!;
    cohort.size = ms.length;
    const [yr, mo] = key.split('-').map(Number);
    const cohortDate = new Date(yr!, mo! - 1, 1);
    for (let n = 0; n < 12; n++) {
      const target = new Date(cohortDate);
      target.setMonth(target.getMonth() + n);
      if (target > now) {
        cohort.retention[n] = null;
        continue;
      }
      const retained = ms.filter((m) => !m.churned || m.churned >= target).length;
      cohort.retention[n] = ms.length > 0 ? retained / ms.length : 0;
    }
  }

  return Array.from(cohorts.values()).filter((c) => c.size > 0);
}
