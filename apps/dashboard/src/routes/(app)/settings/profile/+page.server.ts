import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

const COMMON_TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Madrid',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland'
] as const;

export const load: PageServerLoad = async () => {
  return { timezones: COMMON_TIMEZONES };
};

const ProfileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(120),
  timezone: z.string().min(1).max(60),
  avatar_url: z
    .string()
    .url('Must be a valid URL')
    .max(500)
    .or(z.literal(''))
    .optional()
});

export const actions: Actions = {
  update: async ({ request, locals }) => {
    if (!locals.user) error(401);

    const parsed = ProfileSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) {
      return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid input.' });
    }

    const { full_name, timezone, avatar_url } = parsed.data;

    const { error: e } = await locals.supabase
      .from('user_profiles')
      .update({
        full_name,
        timezone,
        avatar_url: avatar_url && avatar_url.length > 0 ? avatar_url : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', locals.user.id);

    if (e) return fail(500, { error: e.message });

    return { success: true };
  }
};
