-- VaultFlow initial schema: RBAC + Fintech + SaaS + System tables.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

------------------------------------------------------------
-- 1. ORGANIZATIONS
------------------------------------------------------------
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  plan        TEXT NOT NULL DEFAULT 'starter'
              CHECK (plan IN ('starter','growth','enterprise')),
  mode        TEXT NOT NULL DEFAULT 'both'
              CHECK (mode IN ('fintech','saas','both')),
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

------------------------------------------------------------
-- 2. USER PROFILES (extends auth.users)
------------------------------------------------------------
CREATE TABLE user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  avatar_url   TEXT,
  email        TEXT NOT NULL,
  timezone     TEXT NOT NULL DEFAULT 'UTC',
  preferences  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

------------------------------------------------------------
-- 3. ROLES
------------------------------------------------------------
CREATE TABLE roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description  TEXT,
  is_system    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, name)
);

------------------------------------------------------------
-- 4. PERMISSIONS catalog
------------------------------------------------------------
CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource    TEXT NOT NULL,
  action      TEXT NOT NULL,
  description TEXT,
  UNIQUE (resource, action)
);

------------------------------------------------------------
-- 5. ROLE_PERMISSIONS (junction)
------------------------------------------------------------
CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

------------------------------------------------------------
-- 6. ORG_MEMBERS
------------------------------------------------------------
CREATE TABLE org_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id),
  invited_by UUID REFERENCES user_profiles(id),
  status     TEXT NOT NULL DEFAULT 'active'
             CHECK (status IN ('active','invited','suspended')),
  joined_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX idx_org_members_user ON org_members(user_id, status);

------------------------------------------------------------
-- 7. RESOURCE_PERMISSIONS (per-row overrides)
------------------------------------------------------------
CREATE TABLE resource_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  resource    TEXT NOT NULL,
  resource_id UUID,
  action      TEXT NOT NULL,
  granted     BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by  UUID REFERENCES user_profiles(id),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id, resource, resource_id, action)
);

CREATE INDEX idx_resource_perms_lookup
  ON resource_permissions(user_id, org_id, resource, action);

------------------------------------------------------------
-- 8. CUSTOMERS (used by both fintech txns + saas subs)
------------------------------------------------------------
CREATE TABLE customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id  TEXT,
  email        TEXT NOT NULL,
  full_name    TEXT NOT NULL,
  company      TEXT,
  country_code CHAR(2),
  ltv          NUMERIC(15,2) NOT NULL DEFAULT 0,
  mrr          NUMERIC(15,2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','churned','trial','paused','blocked')),
  risk_score   NUMERIC(5,2),
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, email)
);

CREATE INDEX idx_customers_org_status ON customers(org_id, status);

------------------------------------------------------------
-- 9. TRANSACTIONS
------------------------------------------------------------
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reference       TEXT NOT NULL UNIQUE,
  type            TEXT NOT NULL
                  CHECK (type IN ('payment','refund','payout','transfer','fee','adjustment')),
  status          TEXT NOT NULL
                  CHECK (status IN ('pending','processing','completed','failed','reversed','flagged')),
  amount          NUMERIC(15,2) NOT NULL,
  currency        CHAR(3) NOT NULL DEFAULT 'USD',
  fee_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_amount      NUMERIC(15,2) GENERATED ALWAYS AS (amount - fee_amount) STORED,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  payment_method  TEXT,
  channel         TEXT,
  country_code    CHAR(2),
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  flagged_reason  TEXT,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_org_status  ON transactions(org_id, status);
CREATE INDEX idx_transactions_org_created ON transactions(org_id, created_at DESC);
CREATE INDEX idx_transactions_customer    ON transactions(customer_id);

------------------------------------------------------------
-- 10. PAYMENT_METHODS
------------------------------------------------------------
CREATE TABLE payment_methods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('card','bank_account','wallet','crypto')),
  provider     TEXT,
  last_four    CHAR(4),
  expiry_month SMALLINT,
  expiry_year  SMALLINT,
  fingerprint  TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

------------------------------------------------------------
-- 11. FRAUD_SIGNALS
------------------------------------------------------------
CREATE TABLE fraud_signals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  signal_type    TEXT NOT NULL,
  severity       TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  score          NUMERIC(5,2),
  details        JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved       BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by    UUID REFERENCES user_profiles(id),
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_org_unresolved ON fraud_signals(org_id, resolved, created_at DESC);

------------------------------------------------------------
-- 12. PLANS
------------------------------------------------------------
CREATE TABLE plans (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  amount     NUMERIC(10,2) NOT NULL,
  currency   CHAR(3) NOT NULL DEFAULT 'USD',
  interval   TEXT NOT NULL CHECK (interval IN ('monthly','annual')),
  trial_days INTEGER NOT NULL DEFAULT 0,
  features   JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, slug, interval)
);

------------------------------------------------------------
-- 13. SUBSCRIPTIONS
------------------------------------------------------------
CREATE TABLE subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id          UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_id              UUID NOT NULL REFERENCES plans(id),
  status               TEXT NOT NULL
                       CHECK (status IN ('trialing','active','past_due','canceled','paused','unpaid')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end   TIMESTAMPTZ NOT NULL,
  trial_end            TIMESTAMPTZ,
  canceled_at          TIMESTAMPTZ,
  cancel_reason        TEXT,
  mrr                  NUMERIC(10,2) NOT NULL DEFAULT 0,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subs_org_status ON subscriptions(org_id, status);

------------------------------------------------------------
-- 14. INVOICES
------------------------------------------------------------
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  number          TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL
                  CHECK (status IN ('draft','open','paid','void','uncollectible')),
  amount_due      NUMERIC(10,2) NOT NULL,
  amount_paid     NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency        CHAR(3) NOT NULL DEFAULT 'USD',
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  line_items      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

------------------------------------------------------------
-- 15. MRR_SNAPSHOTS
------------------------------------------------------------
CREATE TABLE mrr_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_date         DATE NOT NULL,
  mrr                   NUMERIC(12,2) NOT NULL,
  new_mrr               NUMERIC(12,2) NOT NULL DEFAULT 0,
  expansion_mrr         NUMERIC(12,2) NOT NULL DEFAULT 0,
  contraction_mrr       NUMERIC(12,2) NOT NULL DEFAULT 0,
  churned_mrr           NUMERIC(12,2) NOT NULL DEFAULT 0,
  reactivation_mrr      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_customers       INTEGER NOT NULL,
  active_subscriptions  INTEGER NOT NULL,
  UNIQUE (org_id, snapshot_date)
);

------------------------------------------------------------
-- 16. CHURN_EVENTS
------------------------------------------------------------
CREATE TABLE churn_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  reason          TEXT,
  mrr_lost        NUMERIC(10,2),
  churned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

------------------------------------------------------------
-- 17. AUDIT_LOG
------------------------------------------------------------
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  actor_email TEXT,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  resource_id UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_org_created ON audit_log(org_id, created_at DESC);

------------------------------------------------------------
-- 18. NOTIFICATIONS
------------------------------------------------------------
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);

------------------------------------------------------------
-- updated_at trigger helper
------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_organizations_updated_at  BEFORE UPDATE ON organizations  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_user_profiles_updated_at  BEFORE UPDATE ON user_profiles  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_customers_updated_at      BEFORE UPDATE ON customers      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_subscriptions_updated_at  BEFORE UPDATE ON subscriptions  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
