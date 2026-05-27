-- Permission catalog + RLS policies.
-- This migration must be deterministic — running it twice should not error.

------------------------------------------------------------
-- Permission catalog (resource × action)
------------------------------------------------------------
INSERT INTO permissions (resource, action, description) VALUES
  ('transactions', 'read',    'View transactions'),
  ('transactions', 'create',  'Create transactions'),
  ('transactions', 'update',  'Update transactions'),
  ('transactions', 'delete',  'Delete transactions'),
  ('transactions', 'export',  'Export transactions'),
  ('transactions', 'approve', 'Approve or flag transactions'),

  ('payments', 'read',   'View payments'),
  ('payments', 'create', 'Initiate payments'),

  ('fraud', 'read',    'View fraud signals'),
  ('fraud', 'resolve', 'Resolve fraud signals'),

  ('customers', 'read',   'View customers'),
  ('customers', 'create', 'Create customers'),
  ('customers', 'update', 'Update customers'),
  ('customers', 'delete', 'Delete customers'),
  ('customers', 'export', 'Export customers'),

  ('subscriptions', 'read',   'View subscriptions'),
  ('subscriptions', 'update', 'Update subscriptions'),
  ('subscriptions', 'create', 'Create subscriptions'),

  ('revenue', 'read', 'View revenue analytics'),

  ('reports', 'read',   'View reports'),
  ('reports', 'create', 'Create custom reports'),
  ('reports', 'export', 'Export reports'),

  ('team', 'read',   'View team members'),
  ('team', 'manage', 'Manage team members and roles'),

  ('settings', 'read',   'View settings'),
  ('settings', 'update', 'Update settings'),

  ('billing', 'read',   'View billing'),
  ('billing', 'update', 'Update billing'),

  ('audit_log', 'read', 'View audit log')
ON CONFLICT (resource, action) DO NOTHING;

------------------------------------------------------------
-- Helper: does the calling user have (resource, action) in this org
-- via either role OR an explicit grant?
------------------------------------------------------------
CREATE OR REPLACE FUNCTION user_has_permission(
  p_org_id   UUID,
  p_resource TEXT,
  p_action   TEXT
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  -- Explicit deny wins
  SELECT NOT EXISTS (
    SELECT 1 FROM public.resource_permissions rp
    WHERE rp.user_id = (SELECT auth.uid())
      AND rp.org_id  = p_org_id
      AND rp.resource = p_resource
      AND rp.action   = p_action
      AND rp.granted = FALSE
      AND (rp.expires_at IS NULL OR rp.expires_at > NOW())
  )
  AND (
    -- Role-based grant
    EXISTS (
      SELECT 1
      FROM   public.org_members om
      JOIN   public.role_permissions rp ON rp.role_id = om.role_id
      JOIN   public.permissions p ON p.id = rp.permission_id
      WHERE  om.user_id = (SELECT auth.uid())
        AND  om.org_id  = p_org_id
        AND  om.status  = 'active'
        AND  p.resource = p_resource
        AND  p.action   = p_action
    )
    OR
    -- Explicit grant (non-expired)
    EXISTS (
      SELECT 1 FROM public.resource_permissions rp
      WHERE rp.user_id = (SELECT auth.uid())
        AND rp.org_id  = p_org_id
        AND rp.resource = p_resource
        AND rp.action   = p_action
        AND rp.granted = TRUE
        AND (rp.expires_at IS NULL OR rp.expires_at > NOW())
    )
  );
$$;

------------------------------------------------------------
-- Helper: is the calling user an active member of org_id?
------------------------------------------------------------
CREATE OR REPLACE FUNCTION user_in_org(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = (SELECT auth.uid())
      AND org_id  = p_org_id
      AND status  = 'active'
  );
$$;

------------------------------------------------------------
-- Enable RLS on all tables
------------------------------------------------------------
ALTER TABLE organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_permissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_signals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices              ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrr_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- Organizations: member can read their org
------------------------------------------------------------
CREATE POLICY "organizations_read" ON organizations
  FOR SELECT TO authenticated
  USING (user_in_org(id));

------------------------------------------------------------
-- User profiles: a user can read profiles in their org
------------------------------------------------------------
CREATE POLICY "user_profiles_read" ON user_profiles
  FOR SELECT TO authenticated
  USING (user_in_org(org_id));

CREATE POLICY "user_profiles_self_update" ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

------------------------------------------------------------
-- Roles / permissions catalog / role_permissions:
-- visible to any member of the org (for role display)
------------------------------------------------------------
CREATE POLICY "roles_read" ON roles
  FOR SELECT TO authenticated
  USING (user_in_org(org_id));

CREATE POLICY "permissions_read_all" ON permissions
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "role_permissions_read" ON role_permissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = role_permissions.role_id
        AND user_in_org(r.org_id)
    )
  );

------------------------------------------------------------
-- Org members: visible to any member
-- Mutations gated by team:manage
------------------------------------------------------------
CREATE POLICY "org_members_read" ON org_members
  FOR SELECT TO authenticated
  USING (user_in_org(org_id));

CREATE POLICY "org_members_manage_insert" ON org_members
  FOR INSERT TO authenticated
  WITH CHECK (user_has_permission(org_id, 'team', 'manage'));

CREATE POLICY "org_members_manage_update" ON org_members
  FOR UPDATE TO authenticated
  USING (user_has_permission(org_id, 'team', 'manage'))
  WITH CHECK (user_has_permission(org_id, 'team', 'manage'));

CREATE POLICY "org_members_manage_delete" ON org_members
  FOR DELETE TO authenticated
  USING (user_has_permission(org_id, 'team', 'manage'));

------------------------------------------------------------
-- Resource permissions: a user reads their own row,
-- admin (team:manage) reads/writes all
------------------------------------------------------------
CREATE POLICY "resource_perms_read_self" ON resource_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_has_permission(org_id, 'team', 'manage'));

CREATE POLICY "resource_perms_manage" ON resource_permissions
  FOR ALL TO authenticated
  USING (user_has_permission(org_id, 'team', 'manage'))
  WITH CHECK (user_has_permission(org_id, 'team', 'manage'));

------------------------------------------------------------
-- Generic factory pattern for domain tables.
-- Each table: read gated by (resource, read); write gated by appropriate verb.
------------------------------------------------------------

-- Customers
CREATE POLICY "customers_read"   ON customers   FOR SELECT TO authenticated USING (user_has_permission(org_id, 'customers', 'read'));
CREATE POLICY "customers_insert" ON customers   FOR INSERT TO authenticated WITH CHECK (user_has_permission(org_id, 'customers', 'create'));
CREATE POLICY "customers_update" ON customers   FOR UPDATE TO authenticated USING (user_has_permission(org_id, 'customers', 'update')) WITH CHECK (user_has_permission(org_id, 'customers', 'update'));
CREATE POLICY "customers_delete" ON customers   FOR DELETE TO authenticated USING (user_has_permission(org_id, 'customers', 'delete'));

-- Transactions
CREATE POLICY "transactions_read"   ON transactions FOR SELECT TO authenticated USING (user_has_permission(org_id, 'transactions', 'read'));
CREATE POLICY "transactions_insert" ON transactions FOR INSERT TO authenticated WITH CHECK (user_has_permission(org_id, 'transactions', 'create'));
CREATE POLICY "transactions_update" ON transactions FOR UPDATE TO authenticated USING (user_has_permission(org_id, 'transactions', 'update')) WITH CHECK (user_has_permission(org_id, 'transactions', 'update'));
CREATE POLICY "transactions_delete" ON transactions FOR DELETE TO authenticated USING (user_has_permission(org_id, 'transactions', 'delete'));

-- Payment methods
CREATE POLICY "payment_methods_read"   ON payment_methods FOR SELECT TO authenticated USING (user_has_permission(org_id, 'customers', 'read'));
CREATE POLICY "payment_methods_insert" ON payment_methods FOR INSERT TO authenticated WITH CHECK (user_has_permission(org_id, 'customers', 'update'));
CREATE POLICY "payment_methods_delete" ON payment_methods FOR DELETE TO authenticated USING (user_has_permission(org_id, 'customers', 'update'));

-- Fraud signals
CREATE POLICY "fraud_read"   ON fraud_signals FOR SELECT TO authenticated USING (user_has_permission(org_id, 'fraud', 'read'));
CREATE POLICY "fraud_update" ON fraud_signals FOR UPDATE TO authenticated USING (user_has_permission(org_id, 'fraud', 'resolve')) WITH CHECK (user_has_permission(org_id, 'fraud', 'resolve'));

-- Plans
CREATE POLICY "plans_read"   ON plans FOR SELECT TO authenticated USING (user_has_permission(org_id, 'subscriptions', 'read'));
CREATE POLICY "plans_manage" ON plans FOR ALL    TO authenticated USING (user_has_permission(org_id, 'subscriptions', 'update')) WITH CHECK (user_has_permission(org_id, 'subscriptions', 'update'));

-- Subscriptions
CREATE POLICY "subs_read"   ON subscriptions FOR SELECT TO authenticated USING (user_has_permission(org_id, 'subscriptions', 'read'));
CREATE POLICY "subs_insert" ON subscriptions FOR INSERT TO authenticated WITH CHECK (user_has_permission(org_id, 'subscriptions', 'create'));
CREATE POLICY "subs_update" ON subscriptions FOR UPDATE TO authenticated USING (user_has_permission(org_id, 'subscriptions', 'update')) WITH CHECK (user_has_permission(org_id, 'subscriptions', 'update'));

-- Invoices
CREATE POLICY "invoices_read"   ON invoices FOR SELECT TO authenticated USING (user_has_permission(org_id, 'billing', 'read'));
CREATE POLICY "invoices_update" ON invoices FOR UPDATE TO authenticated USING (user_has_permission(org_id, 'billing', 'update')) WITH CHECK (user_has_permission(org_id, 'billing', 'update'));

-- MRR snapshots
CREATE POLICY "mrr_read" ON mrr_snapshots FOR SELECT TO authenticated USING (user_has_permission(org_id, 'revenue', 'read'));

-- Churn events
CREATE POLICY "churn_read" ON churn_events FOR SELECT TO authenticated USING (user_has_permission(org_id, 'revenue', 'read'));

-- Audit log: read gated by permission. Authenticated users can append
-- entries for their own org and only as themselves (actor_id = auth.uid()).
CREATE POLICY "audit_read" ON audit_log FOR SELECT TO authenticated USING (user_has_permission(org_id, 'audit_log', 'read'));
CREATE POLICY "audit_insert" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_in_org(org_id) AND (actor_id IS NULL OR actor_id = (SELECT auth.uid())));

-- Notifications: a user sees only their own
CREATE POLICY "notifications_read" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_self" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

------------------------------------------------------------
-- Realtime publication (enable change streams on key tables)
------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE fraud_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE mrr_snapshots;
