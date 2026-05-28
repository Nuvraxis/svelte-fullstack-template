import { redirect, error } from '@sveltejs/kit';
import { resolvePermissions, getOrgMembership } from '$lib/server/permissions';
import type { LayoutServerLoad } from './$types';
import type { UserProfile } from '$lib/types/rbac.types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.session || !locals.user) {
    redirect(303, '/login');
  }

  const userId = locals.user.id;

  const [profileResult, org] = await Promise.all([
    locals.supabase
      .from('user_profiles')
      .select('id, email, full_name, avatar_url, timezone, preferences, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle(),
    getOrgMembership(locals.supabase, userId)
  ]);

  if (profileResult.error) {
    console.error('[layout] profile fetch failed', profileResult.error);
  }

  const profile = (profileResult.data as UserProfile | null) ?? {
    id: userId,
    email: locals.user.email ?? '',
    full_name: locals.user.email?.split('@')[0] ?? 'User',
    avatar_url: null,
    timezone: 'UTC',
    preferences: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!org) {
    // Authenticated user with no active org membership — hard-fail with an
    // actionable message. Should be rare; only happens if a user was invited
    // to auth.users but not joined to any org_members row.
    error(403, {
      message: 'Your account is not assigned to an active organization. Contact your admin.'
    });
  }

  const permissions = await resolvePermissions(locals.supabase, userId, org.org_id);

  // Recent notifications for the bell — keep it lean (latest 12 + unread count)
  const [{ data: notes }, { count: unread }] = await Promise.all([
    locals.supabase
      .from('notifications')
      .select('id, type, title, body, read, created_at')
      .eq('org_id', org.org_id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
    locals.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.org_id)
      .eq('user_id', userId)
      .eq('read', false)
  ]);

  return {
    user: profile,
    org,
    permissions,
    notifications: {
      items: notes ?? [],
      unread: unread ?? 0
    }
  };
};
