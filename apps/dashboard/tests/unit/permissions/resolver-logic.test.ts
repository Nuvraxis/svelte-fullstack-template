/**
 * Pure unit test for the resolver's *merge* logic, without hitting Supabase.
 * We rebuild the deny/grant/role precedence here against an inlined sample,
 * mirroring the algorithm in src/lib/server/permissions.ts.
 */
import { describe, it, expect } from 'vitest';

type Override = {
  resource: string;
  action: string;
  granted: boolean;
  expires_at: string | null;
};

function merge(
  rolePerms: Array<[string, string]>,
  overrides: Override[]
): Record<string, boolean> {
  const result: Record<string, boolean> = {};

  for (const [r, a] of rolePerms) {
    result[`${r}:${a}`] = true;
  }

  const now = Date.now();
  for (const o of overrides) {
    if (o.expires_at && new Date(o.expires_at).getTime() < now) continue;
    const key = `${o.resource}:${o.action}`;
    if (o.granted === false) {
      result[key] = false; // explicit deny — final
    } else if (result[key] !== false) {
      result[key] = true;
    }
  }
  return result;
}

describe('permission merge precedence', () => {
  it('returns role permissions when no overrides exist', () => {
    const r = merge([['transactions', 'read'], ['customers', 'read']], []);
    expect(r['transactions:read']).toBe(true);
    expect(r['customers:read']).toBe(true);
    expect(r['audit_log:read']).toBeUndefined();
  });

  it('explicit grant unlocks a permission the role lacks', () => {
    const r = merge(
      [['transactions', 'read']],
      [{ resource: 'transactions', action: 'export', granted: true, expires_at: null }]
    );
    expect(r['transactions:export']).toBe(true);
  });

  it('explicit deny overrides a role grant', () => {
    const r = merge(
      [['transactions', 'read']],
      [{ resource: 'transactions', action: 'read', granted: false, expires_at: null }]
    );
    expect(r['transactions:read']).toBe(false);
  });

  it('deny wins even when a later grant exists for the same key', () => {
    const r = merge(
      [],
      [
        { resource: 'transactions', action: 'read', granted: true,  expires_at: null },
        { resource: 'transactions', action: 'read', granted: false, expires_at: null }
      ]
    );
    expect(r['transactions:read']).toBe(false);
  });

  it('expired overrides are ignored', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const r = merge(
      [['transactions', 'read']],
      [{ resource: 'transactions', action: 'read', granted: false, expires_at: yesterday }]
    );
    expect(r['transactions:read']).toBe(true);
  });

  it('non-expiring overrides without expires_at apply', () => {
    const r = merge(
      [],
      [{ resource: 'reports', action: 'export', granted: true, expires_at: null }]
    );
    expect(r['reports:export']).toBe(true);
  });

  it('future-expiring overrides still apply', () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    const r = merge(
      [],
      [{ resource: 'fraud', action: 'resolve', granted: true, expires_at: tomorrow }]
    );
    expect(r['fraud:resolve']).toBe(true);
  });
});
