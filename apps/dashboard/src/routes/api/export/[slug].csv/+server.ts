import { error } from '@sveltejs/kit';
import { resolvePermissions, getOrgMembership } from '$lib/server/permissions';
import { toCsv } from '$lib/utils/export';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) error(401);
  const org = await getOrgMembership(locals.supabase, locals.user.id);
  if (!org) error(403);
  const perms = await resolvePermissions(locals.supabase, locals.user.id, org.org_id);
  if (!perms['reports:export']) error(403, { message: 'You cannot export reports.' });

  const slug = params.slug;
  const filename = `${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
  let csv: string;

  switch (slug) {
    case 'monthly-summary': {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
      const { data } = await locals.supabase
        .from('mrr_snapshots')
        .select('snapshot_date, mrr, new_mrr, churned_mrr, total_customers, active_subscriptions')
        .eq('org_id', org.org_id)
        .gte('snapshot_date', since)
        .order('snapshot_date', { ascending: true });
      csv = toCsv(data ?? [], [
        { header: 'Date',                 accessor: 'snapshot_date' },
        { header: 'MRR',                  accessor: 'mrr' },
        { header: 'New MRR',              accessor: 'new_mrr' },
        { header: 'Churned MRR',          accessor: 'churned_mrr' },
        { header: 'Total customers',      accessor: 'total_customers' },
        { header: 'Active subscriptions', accessor: 'active_subscriptions' }
      ]);
      break;
    }
    case 'fraud-report': {
      const { data } = await locals.supabase
        .from('fraud_signals')
        .select('signal_type, severity, score, resolved, created_at, transactions!inner(reference, amount, currency, country_code)')
        .eq('org_id', org.org_id)
        .order('created_at', { ascending: false })
        .limit(2000);
      csv = toCsv(data ?? [], [
        { header: 'Created',       accessor: 'created_at' },
        { header: 'Reference',     accessor: (r) => (r as unknown as { transactions: { reference: string } }).transactions.reference },
        { header: 'Signal',        accessor: 'signal_type' },
        { header: 'Severity',      accessor: 'severity' },
        { header: 'Score',         accessor: 'score' },
        { header: 'Resolved',      accessor: 'resolved' },
        { header: 'Amount',        accessor: (r) => (r as unknown as { transactions: { amount: number } }).transactions.amount },
        { header: 'Currency',      accessor: (r) => (r as unknown as { transactions: { currency: string } }).transactions.currency },
        { header: 'Country',       accessor: (r) => (r as unknown as { transactions: { country_code: string | null } }).transactions.country_code ?? '' }
      ]);
      break;
    }
    case 'churn-analysis': {
      const { data } = await locals.supabase
        .from('churn_events')
        .select('reason, mrr_lost, churned_at, customers!inner(email, full_name, company)')
        .eq('org_id', org.org_id)
        .order('churned_at', { ascending: false });
      csv = toCsv(data ?? [], [
        { header: 'Churned at', accessor: 'churned_at' },
        { header: 'Customer',   accessor: (r) => (r as unknown as { customers: { full_name: string } }).customers.full_name },
        { header: 'Email',      accessor: (r) => (r as unknown as { customers: { email: string } }).customers.email },
        { header: 'Company',    accessor: (r) => (r as unknown as { customers: { company: string | null } }).customers.company ?? '' },
        { header: 'Reason',     accessor: 'reason' },
        { header: 'MRR lost',   accessor: 'mrr_lost' }
      ]);
      break;
    }
    case 'revenue-by-country': {
      // Aggregate via SQL view-style query
      const { data } = await locals.supabase
        .from('transactions')
        .select('country_code, amount, fee_amount, currency, status')
        .eq('org_id', org.org_id)
        .eq('status', 'completed');
      const buckets: Record<string, { txns: number; volume: number; fees: number }> = {};
      for (const r of (data ?? []) as Array<{ country_code: string | null; amount: number; fee_amount: number }>) {
        const cc = r.country_code ?? 'XX';
        if (!buckets[cc]) buckets[cc] = { txns: 0, volume: 0, fees: 0 };
        buckets[cc].txns += 1;
        buckets[cc].volume += Number(r.amount);
        buckets[cc].fees += Number(r.fee_amount);
      }
      const rows = Object.entries(buckets)
        .map(([country, b]) => ({ country, ...b }))
        .sort((a, b) => b.volume - a.volume);
      csv = toCsv(rows, [
        { header: 'Country',      accessor: 'country' },
        { header: 'Transactions', accessor: 'txns' },
        { header: 'Volume',       accessor: (r) => r.volume.toFixed(2) },
        { header: 'Fees',         accessor: (r) => r.fees.toFixed(2) }
      ]);
      break;
    }
    default:
      error(404, { message: 'Unknown report' });
  }

  // Audit the export
  await locals.supabase.from('audit_log').insert({
    org_id: org.org_id,
    actor_id: locals.user.id,
    actor_email: locals.user.email,
    action: 'report.exported',
    resource: 'reports',
    new_values: { slug }
  });

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
};
