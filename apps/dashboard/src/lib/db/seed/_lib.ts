/* Shared utilities for seed scripts. */
// Env vars come from `tsx --env-file=.env.local`; no dotenv runtime needed.
import postgres from 'postgres';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

faker.seed(42);
export { faker };

const PUBLIC_SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DATABASE_URL) {
  console.error(
    '\n[seed] Missing env vars. Required: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL\n' +
      '       Did you copy .env.example to .env.local and run `pnpm supabase:start`?\n'
  );
  process.exit(1);
}

export const sql = postgres(DATABASE_URL, {
  max: 4,
  onnotice: () => {} // silence NOTICEs
});

let _admin: SupabaseClient | null = null;
export function admin(): SupabaseClient {
  if (_admin) return _admin;
  _admin = createClient(PUBLIC_SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return _admin;
}

export function pad(n: number, width = 6): string {
  return String(n).padStart(width, '0');
}

export function logSection(title: string): void {
  console.log(`\n\x1b[1m▸ ${title}\x1b[0m`);
}

export function logDone(line: string): void {
  console.log(`  \x1b[32m✓\x1b[0m ${line}`);
}

export async function disconnect(): Promise<void> {
  await sql.end({ timeout: 5 });
}

/* Reproducible numeric helpers */
export function rng(min: number, max: number): number {
  return faker.number.int({ min, max });
}

export function pickWeighted<T>(items: { value: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = faker.number.float({ min: 0, max: total });
  for (const item of items) {
    if (r < item.weight) return item.value;
    r -= item.weight;
  }
  return items[items.length - 1]!.value;
}

/** Truncated log-normal — realistic for B2B payment amounts */
export function logNormal(median: number, sigma: number, min: number, max: number): number {
  const u1 = Math.max(faker.number.float({ min: 0.0001, max: 1 }), 0.0001);
  const u2 = faker.number.float({ min: 0, max: 1 });
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const v = Math.exp(Math.log(median) + sigma * z);
  return Math.max(min, Math.min(max, Math.round(v * 100) / 100));
}

export function daysAgo(days: number, now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

/** Tagged template for raw SQL — re-exported for ergonomic seeds */
export const $sql = sql;
