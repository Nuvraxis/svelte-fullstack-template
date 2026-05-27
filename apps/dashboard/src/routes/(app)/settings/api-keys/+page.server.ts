import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { createHash, randomBytes } from 'node:crypto';
import { getOrgMembership } from '$lib/server/permissions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) error(401);
  const org = await getOrgMembership(locals.supabase, locals.user.id);
  if (!org) error(403);

  const { data: keys } = await locals.supabase
    .from('api_keys')
    .select('id, name, prefix, scopes, last_used_at, expires_at, revoked_at, created_at')
    .eq('org_id', org.org_id)
    .eq('user_id', locals.user.id)
    .order('created_at', { ascending: false });

  return { keys: keys ?? [] };
};

const CreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  scopes: z.array(z.enum(['read', 'write'])).min(1, 'Pick at least one scope')
});

const RevokeSchema = z.object({
  key_id: z.string().uuid()
});

function generateKey(): { plaintext: string; prefix: string; hash: string } {
  // 32 random bytes → 64 hex chars. Prefix `vf_live_` makes it scan-greppable.
  const secret = randomBytes(32).toString('hex');
  const plaintext = `vf_live_${secret}`;
  const prefix = plaintext.slice(0, 8); // 'vf_live_'
  const hash = createHash('sha256').update(plaintext).digest('hex');
  return { plaintext, prefix, hash };
}

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!locals.user) error(401);
    const org = await getOrgMembership(locals.supabase, locals.user.id);
    if (!org) error(403);

    const fd = await request.formData();
    const scopes = fd.getAll('scopes').map(String);
    const parsed = CreateSchema.safeParse({
      name: fd.get('name'),
      scopes
    });
    if (!parsed.success) {
      return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid input.' });
    }

    const { plaintext, prefix, hash } = generateKey();

    const { error: e } = await locals.supabase
      .from('api_keys')
      .insert({
        org_id: org.org_id,
        user_id: locals.user.id,
        name: parsed.data.name,
        prefix,
        hash,
        scopes: parsed.data.scopes
      });

    if (e) return fail(500, { error: e.message });

    await locals.supabase.from('audit_log').insert({
      org_id: org.org_id,
      actor_id: locals.user.id,
      actor_email: locals.user.email,
      action: 'api_key.created',
      resource: 'settings',
      new_values: { name: parsed.data.name, scopes: parsed.data.scopes }
    });

    // Plaintext is returned exactly once — UI must show + tell user to copy.
    return { created: { plaintext, name: parsed.data.name } };
  },

  revoke: async ({ request, locals }) => {
    if (!locals.user) error(401);
    const org = await getOrgMembership(locals.supabase, locals.user.id);
    if (!org) error(403);

    const parsed = RevokeSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return fail(400, { error: 'Invalid request.' });

    const { error: e } = await locals.supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', parsed.data.key_id)
      .eq('org_id', org.org_id)
      .eq('user_id', locals.user.id)
      .is('revoked_at', null);

    if (e) return fail(500, { error: e.message });

    await locals.supabase.from('audit_log').insert({
      org_id: org.org_id,
      actor_id: locals.user.id,
      actor_email: locals.user.email,
      action: 'api_key.revoked',
      resource: 'settings',
      resource_id: parsed.data.key_id
    });

    return { revoked: true };
  }
};
