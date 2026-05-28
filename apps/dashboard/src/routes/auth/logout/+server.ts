import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
  // Local scope: end *this* browser session only. Default 'global' would
  // invalidate every refresh token for the user across all devices, which
  // is rarely what a user expects from "Log out" — they want a "Sign out
  // of all devices" button for that.
  await locals.supabase.auth.signOut({ scope: 'local' });
  redirect(303, '/login');
};
