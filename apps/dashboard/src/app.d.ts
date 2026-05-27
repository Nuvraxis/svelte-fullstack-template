import type { Session, User } from '@supabase/supabase-js';
import type { SupabaseServerClient } from '$lib/server/supabase';
import type { ResolvedPermissions, OrgMembership, UserProfile } from '$lib/types/rbac.types';

declare global {
  namespace App {
    interface Error {
      message: string;
      code?: string;
    }
    interface Locals {
      supabase: SupabaseServerClient;
      safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
      session: Session | null;
      user: User | null;
      profile: UserProfile | null;
      org: OrgMembership | null;
      permissions: ResolvedPermissions;
    }
    interface PageData {
      session?: Session | null;
      user?: UserProfile | null;
      org?: OrgMembership | null;
      permissions?: ResolvedPermissions;
    }
    interface PageState {}
    interface Platform {}
  }
}

export {};
