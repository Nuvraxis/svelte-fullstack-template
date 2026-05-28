import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Cookies } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import type { Database } from '$lib/types/database.types';

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function createSupabaseServerClient(cookies: Cookies) {
  const cookieAdapter: CookieMethodsServer = {
    getAll: () => cookies.getAll(),
    setAll: (cookiesToSet) => {
      for (const { name, value, options } of cookiesToSet) {
        cookies.set(name, value, { ...options, path: '/' });
      }
    }
  };

  return createServerClient<Database>(
    requireEnv('PUBLIC_SUPABASE_URL', publicEnv.PUBLIC_SUPABASE_URL),
    requireEnv('PUBLIC_SUPABASE_ANON_KEY', publicEnv.PUBLIC_SUPABASE_ANON_KEY),
    { cookies: cookieAdapter }
  );
}

export type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

/**
 * Service-role admin client. Server-only. Bypasses RLS — use sparingly
 * (seeds, webhooks, admin operations that aren't user-attributed).
 */
let _admin: ReturnType<typeof createClient<Database>> | null = null;
export function getServiceClient() {
  if (_admin) return _admin;
  _admin = createClient<Database>(
    requireEnv('PUBLIC_SUPABASE_URL', publicEnv.PUBLIC_SUPABASE_URL),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY', privateEnv.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  return _admin;
}
