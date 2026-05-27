import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { resolvePermissions, getOrgMembership } from '$lib/server/permissions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { permissions } = await parent();
  return { canEdit: permissions?.['settings:update'] === true };
};

const OrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only'),
  mode: z.enum(['fintech', 'saas', 'both']),
  logo_url: z.string().url().max(500).or(z.literal('')).optional()
});

export const actions: Actions = {
  update: async ({ request, locals }) => {
    if (!locals.user) error(401);
    const org = await getOrgMembership(locals.supabase, locals.user.id);
    if (!org) error(403);

    const perms = await resolvePermissions(locals.supabase, locals.user.id, org.org_id);
    if (!perms['settings:update']) {
      return fail(403, { error: 'You do not have permission to edit organization settings.' });
    }

    const parsed = OrgSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) {
      return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid input.' });
    }

    const { name, slug, mode, logo_url } = parsed.data;

    const { error: e } = await locals.supabase
      .from('organizations')
      .update({
        name,
        slug,
        mode,
        logo_url: logo_url && logo_url.length > 0 ? logo_url : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', org.org_id);

    if (e) {
      if (e.code === '23505') {
        return fail(409, { error: 'That slug is already taken.' });
      }
      return fail(500, { error: e.message });
    }

    await locals.supabase.from('audit_log').insert({
      org_id: org.org_id,
      actor_id: locals.user.id,
      actor_email: locals.user.email,
      action: 'organization.updated',
      resource: 'settings',
      resource_id: org.org_id,
      new_values: { name, slug, mode }
    });

    return { success: true };
  }
};
