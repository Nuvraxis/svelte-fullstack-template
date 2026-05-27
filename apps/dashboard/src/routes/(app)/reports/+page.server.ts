import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
  const { permissions, org } = await parent();
  if (!permissions || !permissions['reports:read']) {
    error(403, { message: 'You do not have access to reports.' });
  }
  if (!org) error(403);

  // KPI tiles for the report library header
  const [{ count: txCount }, { count: fraudCount }, { count: churnCount }] = await Promise.all([
    locals.supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('org_id', org.org_id),
    locals.supabase.from('fraud_signals').select('id', { count: 'exact', head: true }).eq('org_id', org.org_id).eq('resolved', false),
    locals.supabase.from('churn_events').select('id', { count: 'exact', head: true }).eq('org_id', org.org_id)
  ]);

  return {
    counts: {
      transactions: txCount ?? 0,
      fraud: fraudCount ?? 0,
      churn: churnCount ?? 0
    }
  };
};
