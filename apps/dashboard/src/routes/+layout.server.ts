import type { LayoutServerLoad } from './$types';

// Intentionally returns nothing user-related. The (app) group layout supplies
// the validated user profile to authenticated routes. Returning
// `locals.session` here would serialise session.user, which @supabase/ssr v0.10
// flags as insecure (cookie-derived, unauthenticated).
export const load: LayoutServerLoad = async () => {
  return {};
};
