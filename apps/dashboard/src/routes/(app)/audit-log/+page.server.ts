import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ parent, url, locals }) => {
  const { permissions, org } = await parent();
  if (!permissions || !permissions['audit_log:read']) {
    error(403, { message: 'You do not have access to the audit log.' });
  }
  if (!org) error(403, { message: 'No active organization.' });

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const actor = url.searchParams.get('actor');
  const resource = url.searchParams.get('resource');

  let q = locals.supabase
    .from('audit_log')
    .select('id, actor_email, action, resource, resource_id, ip_address, created_at, old_values, new_values', { count: 'exact' })
    .eq('org_id', org.org_id);

  if (actor) q = q.ilike('actor_email', `%${actor.replace(/[%_]/g, '\\$&')}%`);
  if (resource) q = q.eq('resource', resource);

  q = q.order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: entries, count, error: aErr } = await q;
  if (aErr) {
    console.error('[audit_log] query failed', aErr);
    error(500, { message: 'Failed to load audit log.' });
  }

  return {
    entries: entries ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    filters: { actor, resource }
  };
};
