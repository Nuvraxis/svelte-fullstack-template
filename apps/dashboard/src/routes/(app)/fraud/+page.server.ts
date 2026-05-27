import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { resolvePermissions, getOrgMembership } from '$lib/server/permissions';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 50;
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export const load: PageServerLoad = async ({ parent, url, locals }) => {
  const { permissions, org } = await parent();
  if (!permissions || !permissions['fraud:read']) {
    error(403, { message: 'You do not have access to fraud signals.' });
  }
  if (!org) error(403, { message: 'No active organization.' });

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const sev = url.searchParams.get('severity');
  const showResolved = url.searchParams.get('resolved') === '1';

  let q = locals.supabase
    .from('fraud_signals')
    .select(
      'id, transaction_id, signal_type, severity, score, details, resolved, resolved_at, created_at, transactions!inner(reference, amount, currency, status, customer_id, channel, country_code)',
      { count: 'exact' }
    )
    .eq('org_id', org.org_id);

  if (sev && (VALID_SEVERITIES as readonly string[]).includes(sev)) {
    q = q.eq('severity', sev);
  }
  if (!showResolved) q = q.eq('resolved', false);

  q = q.order('created_at', { ascending: false });
  q = q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: signals, count, error: sErr } = await q;
  if (sErr) {
    console.error('[fraud] query failed', sErr);
    error(500, { message: 'Failed to load fraud signals.' });
  }

  // Aggregate counts by severity for the header KPIs
  const { data: counts } = await locals.supabase
    .from('fraud_signals')
    .select('severity', { count: 'exact', head: false })
    .eq('org_id', org.org_id)
    .eq('resolved', false);
  const severityCounts = (counts ?? []).reduce<Record<string, number>>((acc, r) => {
    const k = (r as { severity: string }).severity;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return {
    signals: signals ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    severity: sev ?? null,
    showResolved,
    severityCounts
  };
};

const ResolveSchema = z.object({
  signal_id: z.string().uuid(),
  resolution: z.enum(['legitimate', 'confirmed_fraud', 'inconclusive'])
});

export const actions: Actions = {
  resolve: async ({ request, locals }) => {
    if (!locals.user) error(401, { message: 'Sign in required.' });
    const org = await getOrgMembership(locals.supabase, locals.user.id);
    if (!org) error(403, { message: 'No active organization.' });
    const permissions = await resolvePermissions(locals.supabase, locals.user.id, org.org_id);
    if (!permissions['fraud:resolve']) {
      error(403, { message: 'You do not have permission to resolve fraud signals.' });
    }

    const data = Object.fromEntries(await request.formData());
    const parsed = ResolveSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    const { error: upErr } = await locals.supabase
      .from('fraud_signals')
      .update({
        resolved: true,
        resolved_by: locals.user.id,
        resolved_at: new Date().toISOString(),
        details: { resolution: parsed.data.resolution }
      })
      .eq('id', parsed.data.signal_id);

    if (upErr) {
      return { success: false, error: { _: [upErr.message] } };
    }
    return { success: true };
  }
};
