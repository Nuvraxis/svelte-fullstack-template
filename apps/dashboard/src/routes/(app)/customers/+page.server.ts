import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;
const VALID_STATUS = ['active', 'churned', 'trial', 'paused', 'blocked'] as const;

export const load: PageServerLoad = async ({ parent, url, locals }) => {
  const { permissions, org } = await parent();
  if (!permissions || !permissions['customers:read']) {
    error(403, { message: 'You do not have access to customers.' });
  }
  if (!org) error(403, { message: 'No active organization.' });

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const status = url.searchParams.get('status');
  const country = url.searchParams.get('country');
  const search = url.searchParams.get('q');

  let q = locals.supabase
    .from('customers')
    .select(
      'id, full_name, email, company, country_code, status, ltv, mrr, risk_score, created_at',
      { count: 'exact' }
    )
    .eq('org_id', org.org_id);

  if (status && (VALID_STATUS as readonly string[]).includes(status)) q = q.eq('status', status);
  if (country) q = q.eq('country_code', country.toUpperCase());
  if (search) {
    const safe = search.replace(/[%_]/g, '\\$&');
    q = q.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%,company.ilike.%${safe}%`);
  }

  q = q.order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: customers, count, error: cErr } = await q;
  if (cErr) {
    console.error('[customers] query failed', cErr);
    error(500, { message: 'Failed to load customers.' });
  }

  return {
    customers: customers ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    filters: { status, country, search }
  };
};
