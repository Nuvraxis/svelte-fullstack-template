import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Supabase Auth callback for email confirmation / magic link / OAuth.
 * Exchanges the code in the URL for a session, then redirects.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(303, next);
  }

  redirect(303, '/login?error=auth_callback');
};
