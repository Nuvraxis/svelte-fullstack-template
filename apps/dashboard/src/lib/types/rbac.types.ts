export type Resource =
  | 'transactions'
  | 'payments'
  | 'fraud'
  | 'customers'
  | 'subscriptions'
  | 'revenue'
  | 'reports'
  | 'team'
  | 'settings'
  | 'billing'
  | 'audit_log';

export type Action =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'approve'
  | 'resolve'
  | 'manage';

export type PermissionKey = `${Resource}:${Action}`;

export type ResolvedPermissions = Record<string, boolean>;

export type SystemRole =
  | 'super_admin'
  | 'admin'
  | 'finance_manager'
  | 'ops_manager'
  | 'analyst'
  | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  timezone: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'growth' | 'enterprise';
  mode: 'fintech' | 'saas' | 'both';
  settings: Record<string, unknown>;
  logo_url: string | null;
}

export interface Role {
  id: string;
  org_id: string;
  name: SystemRole | string;
  display_name: string;
  description: string | null;
  is_system: boolean;
}

export interface OrgMembership {
  id: string;
  org_id: string;
  user_id: string;
  role_id: string;
  status: 'active' | 'invited' | 'suspended';
  joined_at: string | null;
  org: Organization;
  role: Role;
}
