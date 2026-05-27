import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params, locals }) => {
  const { permissions, org } = await parent();
  if (!permissions || !permissions['customers:read']) {
    error(403, { message: 'You do not have access to customers.' });
  }
  if (!org) error(403, { message: 'No active organization.' });

  const { data: customer, error: cErr } = await locals.supabase
    .from('customers')
    .select('*')
    .eq('org_id', org.org_id)
    .eq('id', params.id)
    .maybeSingle();

  if (cErr || !customer) error(404, { message: 'Customer not found.' });

  const [subsResult, txResult, invResult] = await Promise.all([
    locals.supabase
      .from('subscriptions')
      .select('id, status, mrr, current_period_start, current_period_end, plans(name)')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20),
    locals.supabase
      .from('transactions')
      .select('id, reference, type, status, amount, currency, created_at')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10),
    locals.supabase
      .from('invoices')
      .select('id, number, status, amount_due, amount_paid, currency, due_date, paid_at')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10)
  ]);

  return {
    customer: customer as Record<string, unknown>,
    subscriptions: subsResult.data ?? [],
    transactions: txResult.data ?? [],
    invoices: invResult.data ?? []
  };
};
