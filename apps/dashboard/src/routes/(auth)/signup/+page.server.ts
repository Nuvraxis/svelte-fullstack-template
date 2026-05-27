import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions } from './$types';

const SignupSchema = z
  .object({
    org_name: z.string().min(2, 'Organization name is required'),
    full_name: z.string().min(2, 'Full name is required'),
    email: z.string().email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirm: z.string()
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match'
  });

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    const raw = Object.fromEntries(await request.formData());
    const parsed = SignupSchema.safeParse(raw);

    const safeStr = (v: unknown) => (typeof v === 'string' ? v : '');

    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      return fail(400, {
        org_name: safeStr(raw.org_name),
        full_name: safeStr(raw.full_name),
        email: safeStr(raw.email),
        errors: {
          org_name: fe.org_name?.[0],
          full_name: fe.full_name?.[0],
          email: fe.email?.[0],
          password: fe.password?.[0],
          confirm: fe.confirm?.[0]
        }
      });
    }

    const { data, error } = await locals.supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${url.origin}/auth/callback`,
        data: {
          full_name: parsed.data.full_name,
          org_name: parsed.data.org_name
        }
      }
    });

    if (error) {
      return fail(400, {
        org_name: parsed.data.org_name,
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        message: { type: 'error' as const, text: error.message }
      });
    }

    if (data.session) {
      redirect(303, '/dashboard');
    }

    return {
      org_name: parsed.data.org_name,
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      message: { type: 'success' as const, text: 'Account created. Check your email to confirm.' }
    };
  }
};
