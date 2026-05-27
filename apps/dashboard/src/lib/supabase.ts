import { createBrowserClient, isBrowser } from '@supabase/ssr';
import { env } from '$env/dynamic/public';
import type { Database } from '$lib/types/database.types';

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser-side Supabase client. Lazy-singletoned so client components share auth state.
 * Server code should use $lib/server/supabase instead.
 */
export function getBrowserClient() {
  if (!isBrowser()) {
    throw new Error('getBrowserClient() called on the server — use $lib/server/supabase instead');
  }
  if (!_client) {
    _client = createBrowserClient<Database>(
      env.PUBLIC_SUPABASE_URL,
      env.PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return _client;
}

export type SupabaseBrowserClient = ReturnType<typeof getBrowserClient>;
