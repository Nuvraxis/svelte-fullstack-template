-- API keys table — per-user, per-org issuance.
-- We store only a SHA-256 hash of the secret; the plaintext is shown once at creation.

CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  prefix      CHAR(8) NOT NULL,             -- visible prefix, e.g. 'vf_live'
  hash        TEXT NOT NULL,                -- SHA-256 hex of full secret
  scopes      TEXT[] NOT NULL DEFAULT '{}', -- e.g. {'read','write'}
  last_used_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_org ON api_keys(org_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_hash ON api_keys(hash);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Owners can see their own keys; admins can see all in their org.
CREATE POLICY "api_keys_read" ON api_keys
  FOR SELECT TO authenticated
  USING (
    user_in_org(org_id) AND (
      user_id = (SELECT auth.uid())
      OR user_has_permission(org_id, 'billing', 'read')
    )
  );

CREATE POLICY "api_keys_insert" ON api_keys
  FOR INSERT TO authenticated
  WITH CHECK (
    user_in_org(org_id)
    AND user_id = (SELECT auth.uid())
    AND user_has_permission(org_id, 'billing', 'read')
  );

CREATE POLICY "api_keys_update" ON api_keys
  FOR UPDATE TO authenticated
  USING (
    user_in_org(org_id) AND (
      user_id = (SELECT auth.uid())
      OR user_has_permission(org_id, 'billing', 'read')
    )
  );
