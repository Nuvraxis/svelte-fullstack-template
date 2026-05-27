import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions } from './$types';

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'At least 8 characters')
});

const MagicSchema = z.object({
  email: z.string().email('Enter a valid email address')
});

export const actions: Actions = {
  login: async ({ request, locals }) => {
    const data = Object.fromEntries(await request.formData());
    const parsed = LoginSchema.safeParse(data);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return fail(400, {
        action: 'login' as const,
        email: typeof data.email === 'string' ? data.email : '',
        errors: {
          email: fieldErrors.email?.[0],
          password: fieldErrors.password?.[0]
        }
      });
    }

    const { error } = await locals.supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password
    });

    if (error) {
      return fail(401, {
        action: 'login' as const,
        email: parsed.data.email,
        message: { type: 'error' as const, text: 'Invalid email or password.' }
      });
    }

    redirect(303, '/dashboard');
  },

  magic: async ({ request, locals, url }) => {
    const data = Object.fromEntries(await request.formData());
    const parsed = MagicSchema.safeParse(data);

    if (!parsed.success) {
      return fail(400, {
        action: 'magic' as const,
        email: typeof data.email === 'string' ? data.email : '',
        errors: { email: parsed.error.flatten().fieldErrors.email?.[0] }
      });
    }

    const { error } = await locals.supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: `${url.origin}/auth/callback` }
    });

    if (error) {
      return fail(500, {
        action: 'magic' as const,
        email: parsed.data.email,
        message: { type: 'error' as const, text: 'Could not send magic link. Try again.' }
      });
    }

    return {
      action: 'magic' as const,
      email: parsed.data.email,
      message: { type: 'success' as const, text: 'Check your email for a sign-in link.' }
    };
  }
};
