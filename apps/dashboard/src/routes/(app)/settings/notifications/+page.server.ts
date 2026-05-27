import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

export interface NotificationPrefs {
  fraud_alert: boolean;
  payment_failed: boolean;
  churn_risk: boolean;
  invite: boolean;
  report: boolean;
  email_digest: boolean;
}

const DEFAULTS: NotificationPrefs = {
  fraud_alert: true,
  payment_failed: true,
  churn_risk: true,
  invite: true,
  report: true,
  email_digest: false
};

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) error(401);

  const { data: profile } = await locals.supabase
    .from('user_profiles')
    .select('preferences')
    .eq('id', locals.user.id)
    .maybeSingle();

  const stored = ((profile?.preferences as { notifications?: Partial<NotificationPrefs> } | null)
    ?.notifications) ?? {};
  const prefs: NotificationPrefs = { ...DEFAULTS, ...stored };

  return { prefs };
};

const PrefsSchema = z.object({
  fraud_alert: z.coerce.boolean(),
  payment_failed: z.coerce.boolean(),
  churn_risk: z.coerce.boolean(),
  invite: z.coerce.boolean(),
  report: z.coerce.boolean(),
  email_digest: z.coerce.boolean()
});

export const actions: Actions = {
  update: async ({ request, locals }) => {
    if (!locals.user) error(401);

    const fd = await request.formData();
    const input: Record<string, string> = {};
    for (const key of Object.keys(DEFAULTS)) {
      input[key] = fd.get(key) ? 'true' : 'false';
    }

    const parsed = PrefsSchema.safeParse(input);
    if (!parsed.success) {
      return fail(400, { error: 'Invalid input.' });
    }

    // Fetch current preferences to merge (don't clobber other keys)
    const { data: cur } = await locals.supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', locals.user.id)
      .maybeSingle();

    const existing = (cur?.preferences as Record<string, unknown> | null) ?? {};
    const updated = { ...existing, notifications: parsed.data };

    const { error: e } = await locals.supabase
      .from('user_profiles')
      .update({ preferences: updated, updated_at: new Date().toISOString() })
      .eq('id', locals.user.id);

    if (e) return fail(500, { error: e.message });

    return { success: true };
  }
};
