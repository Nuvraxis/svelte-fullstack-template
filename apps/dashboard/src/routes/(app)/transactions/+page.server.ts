import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;

const VALID_STATUSES = ['pending', 'processing', 'completed', 'failed', 'reversed', 'flagged'] as const;
const VALID_TYPES    = ['payment', 'refund', 'payout', 'transfer', 'fee', 'adjustment'] as const;
const VALID_SORT     = ['created_at', 'amount', 'reference', 'status'] as const;

type Filters = {
  status?: typeof VALID_STATUSES[number];
  type?: typeof VALID_TYPES[number];
  currency?: string;
  search?: string;
  from?: string;
  to?: string;
};

export const load: PageServerLoad = async ({ parent, url, locals }) => {
  const { permissions, org } = await parent();
  if (!permissions || !permissions['transactions:read']) {
    error(403, { message: 'You do not have access to transactions.' });
  }
  if (!org) error(403, { message: 'No active organization.' });

  // Parse URL state
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const sortColRaw = url.searchParams.get('sort') ?? 'created_at';
  const sortCol = (VALID_SORT as readonly string[]).includes(sortColRaw) ? sortColRaw : 'created_at';
  const sortDir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc';

  const filters: Filters = {
    status:   (VALID_STATUSES as readonly string[]).includes(url.searchParams.get('status') ?? '') ? (url.searchParams.get('status') as Filters['status']) : undefined,
    type:     (VALID_TYPES    as readonly string[]).includes(url.searchParams.get('type')   ?? '') ? (url.searchParams.get('type')   as Filters['type'])   : undefined,
    currency: url.searchParams.get('currency') || undefined,
    search:   url.searchParams.get('q') || undefined,
    from:     url.searchParams.get('from') || undefined,
    to:       url.searchParams.get('to') || undefined
  };

  // Build base query
  let q = locals.supabase
    .from('transactions')
    .select('id, reference, type, status, amount, currency, fee_amount, customer_id, payment_method, channel, country_code, processed_at, created_at, flagged_reason', { count: 'exact' })
    .eq('org_id', org.org_id);

  if (filters.status)   q = q.eq('status', filters.status);
  if (filters.type)     q = q.eq('type', filters.type);
  if (filters.currency) q = q.eq('currency', filters.currency.toUpperCase());
  if (filters.from)     q = q.gte('created_at', filters.from);
  if (filters.to)       q = q.lte('created_at', filters.to);
  if (filters.search) {
    // search by reference (partial) — escape % to avoid wildcard injection
    const safe = filters.search.replace(/[%_]/g, '\\$&');
    q = q.ilike('reference', `%${safe}%`);
  }

  q = q.order(sortCol, { ascending: sortDir === 'asc' }).order('id', { ascending: false });
  q = q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: transactions, count, error: txErr } = await q;
  if (txErr) {
    console.error('[transactions] query failed', txErr);
    error(500, { message: 'Failed to load transactions.' });
  }

  // Fetch only the customers referenced on this page (avoid join cost)
  const customerIds = Array.from(
    new Set((transactions ?? []).map((t) => t.customer_id).filter(Boolean) as string[])
  );
  let customersById: Record<string, { id: string; full_name: string; email: string }> = {};
  if (customerIds.length) {
    const { data: customers } = await locals.supabase
      .from('customers')
      .select('id, full_name, email')
      .in('id', customerIds);
    customersById = Object.fromEntries((customers ?? []).map((c) => [c.id, c]));
  }

  // If the URL has ?txn=<id>, also fetch that transaction's full detail for the slide-over.
  const selectedId = url.searchParams.get('txn');
  let selected = null as null | {
    transaction: Record<string, unknown>;
    customer: { id: string; full_name: string; email: string; company: string | null } | null;
    fraud_signals: Array<{ id: string; signal_type: string; severity: string; score: number | null; resolved: boolean; created_at: string }>;
  };
  if (selectedId) {
    const { data: tx } = await locals.supabase
      .from('transactions')
      .select('*')
      .eq('org_id', org.org_id)
      .eq('id', selectedId)
      .maybeSingle();
    if (tx) {
      const [{ data: cust }, { data: signals }] = await Promise.all([
        tx.customer_id
          ? locals.supabase.from('customers').select('id, full_name, email, company').eq('id', tx.customer_id).maybeSingle()
          : Promise.resolve({ data: null }),
        locals.supabase.from('fraud_signals').select('id, signal_type, severity, score, resolved, created_at').eq('transaction_id', tx.id)
      ]);
      selected = {
        transaction: tx as Record<string, unknown>,
        customer: (cust as { id: string; full_name: string; email: string; company: string | null } | null) ?? null,
        fraud_signals: (signals as Array<{ id: string; signal_type: string; severity: string; score: number | null; resolved: boolean; created_at: string }>) ?? []
      };
    }
  }

  return {
    transactions: transactions ?? [],
    customersById,
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    sort: { column: sortCol, direction: sortDir as 'asc' | 'desc' },
    filters,
    selected
  };
};
