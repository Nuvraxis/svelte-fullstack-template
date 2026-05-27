import { error } from '@sveltejs/kit';
import { resolvePermissions, getOrgMembership } from '$lib/server/permissions';
import type { PageServerLoad } from './$types';

const PLAN_DETAILS = {
  starter:    { name: 'Starter',    price: 49,   features: ['Up to 5 team members', '10k transactions/mo', 'Email support'] },
  growth:     { name: 'Growth',     price: 199,  features: ['Up to 25 team members', '100k transactions/mo', 'Priority support', 'Custom reports'] },
  enterprise: { name: 'Enterprise', price: 999,  features: ['Unlimited team members', 'Unlimited transactions', 'Dedicated success manager', 'SSO + SCIM', 'Custom SLAs'] }
} as const;

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) error(401);
  const org = await getOrgMembership(locals.supabase, locals.user.id);
  if (!org) error(403);

  const perms = await resolvePermissions(locals.supabase, locals.user.id, org.org_id);
  if (!perms['billing:read']) {
    error(403, { message: 'You do not have access to billing.' });
  }

  // Recent org invoices (linked to org-level subscriptions, not customer subs)
  // For demo: we surface the org's customer-side invoice activity as a proxy.
  const since = new Date();
  since.setMonth(since.getMonth() - 12);

  const [{ data: invoices }, { count: paidCount }, { count: dueCount }] = await Promise.all([
    locals.supabase
      .from('invoices')
      .select('id, number, status, amount_due, amount_paid, currency, due_date, paid_at, created_at')
      .eq('org_id', org.org_id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(12),
    locals.supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.org_id)
      .eq('status', 'paid'),
    locals.supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.org_id)
      .in('status', ['open', 'uncollectible'])
  ]);

  return {
    invoices: invoices ?? [],
    paidCount: paidCount ?? 0,
    dueCount: dueCount ?? 0,
    plans: PLAN_DETAILS
  };
};
