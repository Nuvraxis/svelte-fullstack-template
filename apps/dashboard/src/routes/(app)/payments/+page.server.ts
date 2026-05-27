import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
  const { permissions, org } = await parent();
  if (!permissions || !permissions['payments:read']) {
    error(403, { message: 'You do not have access to payments.' });
  }
  if (!org) error(403, { message: 'No active organization.' });

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString();

  // Aggregates by provider + status (last 30 days, payment-type only)
  const [
    { data: methods },
    { data: txns },
    { count: totalPayments }
  ] = await Promise.all([
    locals.supabase
      .from('payment_methods')
      .select('type, provider')
      .eq('org_id', org.org_id),
    locals.supabase
      .from('transactions')
      .select('id, reference, status, amount, fee_amount, currency, payment_method, channel, created_at, customer_id, customers!left(full_name, company)')
      .eq('org_id', org.org_id)
      .eq('type', 'payment')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(15),
    locals.supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.org_id)
      .eq('type', 'payment')
      .gte('created_at', sinceIso)
  ]);

  // Method mix
  const methodMix: Record<string, number> = {};
  for (const m of (methods ?? []) as Array<{ type: string }>) {
    methodMix[m.type] = (methodMix[m.type] ?? 0) + 1;
  }

  // Provider breakdown
  const providerMix: Record<string, number> = {};
  for (const m of (methods ?? []) as Array<{ provider: string | null }>) {
    const p = m.provider ?? 'other';
    providerMix[p] = (providerMix[p] ?? 0) + 1;
  }

  // Volume + success rate aggregates over the last 30d (across ALL payment txns,
  // not just the visible 15 in `txns`). Cheap single roll-up.
  const { data: agg } = await locals.supabase
    .from('transactions')
    .select('status, amount, fee_amount, currency')
    .eq('org_id', org.org_id)
    .eq('type', 'payment')
    .gte('created_at', sinceIso);

  let volume = 0;
  let fees = 0;
  let completed = 0;
  let failed = 0;
  for (const t of (agg ?? []) as Array<{ status: string; amount: number; fee_amount: number }>) {
    if (t.status === 'completed') {
      completed++;
      volume += Number(t.amount ?? 0);
      fees += Number(t.fee_amount ?? 0);
    } else if (t.status === 'failed') {
      failed++;
    }
  }
  const successRate = completed + failed > 0 ? completed / (completed + failed) : 0;

  return {
    recent: txns ?? [],
    methodMix,
    providerMix,
    totalPayments: totalPayments ?? 0,
    volume,
    fees,
    successRate,
    completedCount: completed,
    failedCount: failed
  };
};
