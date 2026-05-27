import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
  const { org } = await parent();
  if (!org) error(403, { message: 'No active organization.' });

  const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const since60d = new Date(Date.now() - 60 * 86_400_000).toISOString();

  // Run all dashboard queries in parallel
  const [
    volumeNow,
    volumePrev,
    txCountNow,
    successCount,
    feeSum,
    mrrSnapshots,
    fraudUnresolved,
    recentTransactions,
    topCustomers,
    txByStatus
  ] = await Promise.all([
    // Total volume last 30d
    locals.supabase
      .from('transactions')
      .select('amount.sum(), currency')
      .eq('org_id', org.org_id)
      .eq('status', 'completed')
      .gte('created_at', since30d)
      .maybeSingle(),
    // Volume previous 30d (30-60)
    locals.supabase
      .from('transactions')
      .select('amount.sum()')
      .eq('org_id', org.org_id)
      .eq('status', 'completed')
      .gte('created_at', since60d)
      .lt('created_at', since30d)
      .maybeSingle(),
    // Total transactions last 30d
    locals.supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.org_id)
      .gte('created_at', since30d),
    // Successful transactions last 30d
    locals.supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.org_id)
      .eq('status', 'completed')
      .gte('created_at', since30d),
    // Fees collected last 30d
    locals.supabase
      .from('transactions')
      .select('fee_amount.sum()')
      .eq('org_id', org.org_id)
      .eq('status', 'completed')
      .gte('created_at', since30d)
      .maybeSingle(),
    // MRR snapshots last 30d for trend
    locals.supabase
      .from('mrr_snapshots')
      .select('snapshot_date, mrr, active_subscriptions, total_customers')
      .eq('org_id', org.org_id)
      .gte('snapshot_date', since30d.slice(0, 10))
      .order('snapshot_date', { ascending: true }),
    // Unresolved fraud alerts
    locals.supabase
      .from('fraud_signals')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.org_id)
      .eq('resolved', false),
    // 10 most recent transactions (realtime feed)
    locals.supabase
      .from('transactions')
      .select('id, reference, type, status, amount, currency, customer_id, created_at')
      .eq('org_id', org.org_id)
      .order('created_at', { ascending: false })
      .limit(10),
    // Top 5 customers by LTV
    locals.supabase
      .from('customers')
      .select('id, full_name, email, company, ltv, mrr, status, country_code')
      .eq('org_id', org.org_id)
      .order('ltv', { ascending: false })
      .limit(5),
    // Status breakdown for donut
    locals.supabase
      .from('transactions')
      .select('status')
      .eq('org_id', org.org_id)
      .gte('created_at', since30d)
  ]);

  const sumVolume = (r: { data: unknown }): number => {
    const row = r.data as { sum?: number } | null;
    return Number(row?.sum ?? 0);
  };

  const statusBreakdown = ((txByStatus.data ?? []) as Array<{ status: string }>).reduce<
    Record<string, number>
  >((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  // Hydrate customer names for the recent feed
  const recentCustomerIds = Array.from(
    new Set((recentTransactions.data ?? []).map((t) => t.customer_id).filter(Boolean) as string[])
  );
  let recentCustomersById: Record<string, { full_name: string }> = {};
  if (recentCustomerIds.length) {
    const { data: rc } = await locals.supabase
      .from('customers')
      .select('id, full_name')
      .in('id', recentCustomerIds);
    recentCustomersById = Object.fromEntries((rc ?? []).map((c) => [c.id, c]));
  }

  return {
    kpis: {
      volume30d:    sumVolume(volumeNow),
      volumePrev:   sumVolume(volumePrev),
      txCount:      txCountNow.count ?? 0,
      successCount: successCount.count ?? 0,
      feesCollected: sumVolume(feeSum),
      fraudUnresolved: fraudUnresolved.count ?? 0
    },
    mrrSnapshots: mrrSnapshots.data ?? [],
    recentTransactions: recentTransactions.data ?? [],
    recentCustomersById,
    topCustomers: topCustomers.data ?? [],
    statusBreakdown
  };
};
