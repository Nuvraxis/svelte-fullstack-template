import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;
const VALID_STATUS = ['trialing', 'active', 'past_due', 'canceled', 'paused', 'unpaid'] as const;

export const load: PageServerLoad = async ({ parent, url, locals }) => {
  const { permissions, org } = await parent();
  if (!permissions || !permissions['subscriptions:read']) {
    error(403, { message: 'You do not have access to subscriptions.' });
  }
  if (!org) error(403, { message: 'No active organization.' });

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const status = url.searchParams.get('status');

  let q = locals.supabase
    .from('subscriptions')
    .select(
      'id, status, mrr, current_period_start, current_period_end, trial_end, canceled_at, customer_id, plan_id, created_at, customers!inner(full_name, email), plans!inner(name, interval)',
      { count: 'exact' }
    )
    .eq('org_id', org.org_id);

  if (status && (VALID_STATUS as readonly string[]).includes(status)) q = q.eq('status', status);

  q = q.order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: subs, count, error: sErr } = await q;
  if (sErr) {
    console.error('[subs] query failed', sErr);
    error(500, { message: 'Failed to load subscriptions.' });
  }

  // Aggregate MRR by plan for the top KPI strip
  const { data: planAgg } = await locals.supabase
    .from('subscriptions')
    .select('plan_id, mrr, status, plans!inner(name)')
    .eq('org_id', org.org_id)
    .in('status', ['active', 'trialing']);
  const planMrr = (planAgg ?? []).reduce<Record<string, { name: string; mrr: number; count: number }>>((acc, r) => {
    const rec = r as unknown as { plan_id: string; mrr: number; plans: { name: string } };
    const key = rec.plans.name;
    if (!acc[key]) acc[key] = { name: key, mrr: 0, count: 0 };
    acc[key].mrr += Number(rec.mrr ?? 0);
    acc[key].count += 1;
    return acc;
  }, {});

  return {
    subscriptions: subs ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    status,
    planMrr
  };
};
