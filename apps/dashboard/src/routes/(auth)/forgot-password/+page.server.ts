import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions } from './$types';

const ForgotSchema = z.object({
  email: z.string().email('Enter a valid email')
});

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    const raw = Object.fromEntries(await request.formData());
    const parsed = ForgotSchema.safeParse(raw);
    const safeEmail = typeof raw.email === 'string' ? raw.email : '';

    if (!parsed.success) {
      return fail(400, {
        email: safeEmail,
        errors: { email: parsed.error.flatten().fieldErrors.email?.[0] }
      });
    }

    const { error } = await locals.supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${url.origin}/auth/callback?next=/settings/profile`
    });

    if (error) {
      return fail(400, {
        email: parsed.data.email,
        message: { type: 'error' as const, text: error.message }
      });
    }

    return {
      email: parsed.data.email,
      message: { type: 'success' as const, text: 'If that email exists, a reset link has been sent.' }
    };
  }
};
