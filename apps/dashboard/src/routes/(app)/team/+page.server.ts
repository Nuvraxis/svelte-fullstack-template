import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { resolvePermissions, getOrgMembership } from '$lib/server/permissions';
import { getServiceClient } from '$lib/server/supabase';
import type { Actions, PageServerLoad } from './$types';

const ALL_RESOURCES = [
  'transactions', 'payments', 'fraud',
  'customers', 'subscriptions', 'revenue',
  'reports', 'team', 'settings', 'billing', 'audit_log'
] as const;

export const load: PageServerLoad = async ({ parent, locals, url }) => {
  const { permissions, org } = await parent();
  if (!permissions || !permissions['team:read']) {
    error(403, { message: 'You do not have access to team management.' });
  }
  if (!org) error(403, { message: 'No active organization.' });

  // Members + their roles + profiles
  const { data: members, error: mErr } = await locals.supabase
    .from('org_members')
    .select(`
      id, status, joined_at,
      user_profiles!org_members_user_id_fkey!inner(id, full_name, email, avatar_url),
      roles!inner(id, name, display_name)
    `)
    .eq('org_id', org.org_id)
    .order('created_at', { ascending: true });

  if (mErr) {
    console.error('[team] members fetch failed', mErr);
    error(500, { message: 'Failed to load team.' });
  }

  // All roles for the change-role dropdown
  const { data: roles } = await locals.supabase
    .from('roles')
    .select('id, name, display_name, description')
    .eq('org_id', org.org_id)
    .order('display_name', { ascending: true });

  // All permissions catalog (for the override matrix)
  const { data: catalog } = await locals.supabase
    .from('permissions')
    .select('id, resource, action, description')
    .order('resource', { ascending: true })
    .order('action', { ascending: true });

  // If a user is selected, also load their resolved permissions
  const selectedUserId = url.searchParams.get('user');
  let selectedDetail = null as null | {
    member: Record<string, unknown>;
    role_permissions: Array<{ resource: string; action: string }>;
    overrides: Array<{ id: string; resource: string; resource_id: string | null; action: string; granted: boolean; expires_at: string | null; created_at: string }>;
  };
  if (selectedUserId) {
    const member = (members ?? []).find(
      (m) => (m as unknown as { user_profiles: { id: string } }).user_profiles.id === selectedUserId
    );
    if (member) {
      const roleId = (member as unknown as { roles: { id: string } }).roles.id;
      const { data: rp } = await locals.supabase
        .from('role_permissions')
        .select('permissions!inner(resource, action)')
        .eq('role_id', roleId);
      const { data: ov } = await locals.supabase
        .from('resource_permissions')
        .select('id, resource, resource_id, action, granted, expires_at, created_at')
        .eq('user_id', selectedUserId)
        .eq('org_id', org.org_id);

      selectedDetail = {
        member: member as Record<string, unknown>,
        role_permissions: (rp ?? []).map((r) => (r as unknown as { permissions: { resource: string; action: string } }).permissions),
        overrides: (ov as Array<{ id: string; resource: string; resource_id: string | null; action: string; granted: boolean; expires_at: string | null; created_at: string }>) ?? []
      };
    }
  }

  return {
    members: members ?? [],
    roles: roles ?? [],
    catalog: catalog ?? [],
    selectedUserId,
    selectedDetail
  };
};

const ToggleSchema = z.object({
  user_id: z.string().uuid(),
  resource: z.enum(ALL_RESOURCES),
  action: z.string().min(1),
  /** desired state: grant | deny | clear */
  state: z.enum(['grant', 'deny', 'clear'])
});

const ChangeRoleSchema = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid()
});

const InviteSchema = z.object({
  email: z.string().email().max(200),
  full_name: z.string().min(1).max(120),
  role_id: z.string().uuid()
});

export const actions: Actions = {
  togglePermission: async ({ request, locals }) => {
    if (!locals.user) error(401, { message: 'Sign in required.' });
    const org = await getOrgMembership(locals.supabase, locals.user.id);
    if (!org) error(403, { message: 'No org.' });
    const perms = await resolvePermissions(locals.supabase, locals.user.id, org.org_id);
    if (!perms['team:manage']) {
      error(403, { message: 'You do not have permission to manage team.' });
    }

    const parsed = ToggleSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return fail(400, { error: parsed.error.flatten() });

    const { user_id, resource, action, state } = parsed.data;

    // First clear any existing override (global-scope) for this (user, resource, action)
    await locals.supabase
      .from('resource_permissions')
      .delete()
      .eq('org_id', org.org_id)
      .eq('user_id', user_id)
      .eq('resource', resource)
      .eq('action', action)
      .is('resource_id', null);

    if (state === 'clear') {
      await locals.supabase.from('audit_log').insert({
        org_id: org.org_id,
        actor_id: locals.user.id,
        actor_email: locals.user.email,
        action: 'permission.cleared',
        resource: 'team',
        resource_id: user_id,
        new_values: { resource, action }
      });
      return { success: true };
    }

    const { error: insErr } = await locals.supabase
      .from('resource_permissions')
      .insert({
        org_id: org.org_id,
        user_id,
        resource,
        action,
        granted: state === 'grant',
        granted_by: locals.user.id
      });
    if (insErr) return fail(500, { error: insErr.message });

    await locals.supabase.from('audit_log').insert({
      org_id: org.org_id,
      actor_id: locals.user.id,
      actor_email: locals.user.email,
      action: state === 'grant' ? 'permission.granted' : 'permission.denied',
      resource: 'team',
      resource_id: user_id,
      new_values: { resource, action }
    });

    return { success: true };
  },

  changeRole: async ({ request, locals }) => {
    if (!locals.user) error(401);
    const org = await getOrgMembership(locals.supabase, locals.user.id);
    if (!org) error(403);
    const perms = await resolvePermissions(locals.supabase, locals.user.id, org.org_id);
    if (!perms['team:manage']) error(403, { message: 'Cannot manage team.' });

    const parsed = ChangeRoleSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return fail(400, { error: parsed.error.flatten() });

    const { error: upErr } = await locals.supabase
      .from('org_members')
      .update({ role_id: parsed.data.role_id })
      .eq('org_id', org.org_id)
      .eq('user_id', parsed.data.user_id);
    if (upErr) return fail(500, { error: upErr.message });

    await locals.supabase.from('audit_log').insert({
      org_id: org.org_id,
      actor_id: locals.user.id,
      actor_email: locals.user.email,
      action: 'role.changed',
      resource: 'team',
      resource_id: parsed.data.user_id,
      new_values: { role_id: parsed.data.role_id }
    });

    return { success: true };
  },

  inviteMember: async ({ request, locals }) => {
    if (!locals.user) error(401);
    const org = await getOrgMembership(locals.supabase, locals.user.id);
    if (!org) error(403);
    const perms = await resolvePermissions(locals.supabase, locals.user.id, org.org_id);
    if (!perms['team:manage']) {
      return fail(403, { invite: { error: 'You do not have permission to manage team.' } });
    }

    const parsed = InviteSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) {
      return fail(400, {
        invite: { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
      });
    }

    const { email, full_name, role_id } = parsed.data;
    const admin = getServiceClient();

    // 1. Create the auth user (idempotent: if exists, fetch them instead)
    let newUserId: string | null = null;
    const created = await admin.auth.admin.createUser({
      email,
      password: 'Demo@1234',
      email_confirm: true,
      user_metadata: { full_name, invited_to: org.org_id }
    });

    if (created.error) {
      // Likely "User already registered" — look them up
      const list = await admin.auth.admin.listUsers({ perPage: 200 });
      const existing = list.data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (existing) {
        newUserId = existing.id;
      } else {
        return fail(500, { invite: { error: created.error.message } });
      }
    } else {
      newUserId = created.data.user?.id ?? null;
    }
    if (!newUserId) return fail(500, { invite: { error: 'Failed to create user.' } });

    // 2. Upsert user_profile (service client bypasses RLS)
    const { error: profErr } = await admin
      .from('user_profiles')
      .upsert(
        {
          id: newUserId,
          org_id: org.org_id,
          full_name,
          email,
          timezone: 'UTC'
        },
        { onConflict: 'id' }
      );
    if (profErr) return fail(500, { invite: { error: profErr.message } });

    // 3. Insert org_members (status=invited)
    const { error: memErr } = await admin
      .from('org_members')
      .insert({
        org_id: org.org_id,
        user_id: newUserId,
        role_id,
        invited_by: locals.user.id,
        status: 'invited'
      });
    if (memErr) {
      if (memErr.code === '23505') {
        return fail(409, { invite: { error: 'That user is already in your organization.' } });
      }
      return fail(500, { invite: { error: memErr.message } });
    }

    await locals.supabase.from('audit_log').insert({
      org_id: org.org_id,
      actor_id: locals.user.id,
      actor_email: locals.user.email,
      action: 'user.invited',
      resource: 'team',
      resource_id: newUserId,
      new_values: { email, role_id }
    });

    return { invite: { success: true, email } };
  }
};
