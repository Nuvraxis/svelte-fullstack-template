import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';
import type {
  Resource,
  Action,
  ResolvedPermissions,
  OrgMembership
} from '$lib/types/rbac.types';

/**
 * Resolve effective permissions for a user within an organization.
 *
 * Resolution order (highest priority first):
 *   1. resource_permissions where granted = FALSE         => explicit DENY
 *   2. resource_permissions where granted = TRUE          => explicit GRANT
 *   3. role_permissions via the user's org_members.role   => role default
 *   4. Default                                            => deny
 */
export async function resolvePermissions(
  supabase: SupabaseClient<Database>,
  userId: string,
  orgId: string,
  resourceId?: string
): Promise<ResolvedPermissions> {
  const result: ResolvedPermissions = {};

  // Role-derived permissions
  const { data: rolePerms, error: rolePermsErr } = await supabase
    .from('org_members')
    .select(
      `
      role_id,
      roles!inner(
        id,
        role_permissions(
          permissions(resource, action)
        )
      )
    `
    )
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('status', 'active')
    .maybeSingle();

  if (rolePermsErr) {
    console.error('[permissions] role lookup failed', rolePermsErr);
    return result;
  }
  if (!rolePerms) return result;

  // Walk the nested relation graph
  const rolesNode = (rolePerms as { roles?: unknown }).roles as
    | { role_permissions?: Array<{ permissions: { resource: string; action: string } | null }> }
    | undefined;
  const rolePermList = rolesNode?.role_permissions ?? [];
  for (const rp of rolePermList) {
    if (rp.permissions) {
      result[`${rp.permissions.resource}:${rp.permissions.action}`] = true;
    }
  }

  // Per-resource overrides
  let overrideQuery = supabase
    .from('resource_permissions')
    .select('resource, resource_id, action, granted, expires_at')
    .eq('user_id', userId)
    .eq('org_id', orgId);

  if (resourceId) {
    overrideQuery = overrideQuery.or(`resource_id.is.null,resource_id.eq.${resourceId}`);
  }

  const { data: overrides, error: overridesErr } = await overrideQuery;
  if (overridesErr) {
    console.error('[permissions] override lookup failed', overridesErr);
    return result;
  }

  type Override = {
    resource: string;
    resource_id: string | null;
    action: string;
    granted: boolean;
    expires_at: string | null;
  };

  const now = Date.now();
  for (const o of (overrides ?? []) as Override[]) {
    if (o.expires_at && new Date(o.expires_at).getTime() < now) continue;
    const key = `${o.resource}:${o.action}`;
    if (o.granted === false) {
      result[key] = false; // explicit deny — final
    } else if (result[key] !== false) {
      // explicit grant — but never overrides an explicit deny
      result[key] = true;
    }
  }

  return result;
}

export async function getOrgMembership(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<OrgMembership | null> {
  const { data, error } = await supabase
    .from('org_members')
    .select(
      `
      id, org_id, user_id, role_id, status, joined_at,
      org:organizations!inner(id, name, slug, plan, mode, settings, logo_url),
      role:roles!inner(id, org_id, name, display_name, description, is_system)
    `
    )
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as OrgMembership;
}

export function can(
  permissions: ResolvedPermissions,
  resource: Resource,
  action: Action
): boolean {
  return permissions[`${resource}:${action}`] === true;
}
