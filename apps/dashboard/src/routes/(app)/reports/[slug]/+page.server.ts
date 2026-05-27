import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { resolvePermissions, getOrgMembership } from '$lib/server/permissions';
import type { Actions, PageServerLoad } from './$types';

const REPORTS = {
  'monthly-summary': {
    name: 'Monthly summary',
    description: 'Revenue, transactions, and customer growth metrics for the past 30 days.',
    scopeLabel: 'Last 30 days'
  },
  'fraud-report': {
    name: 'Fraud report',
    description: 'All unresolved fraud signals with severity, score, and linked transaction.',
    scopeLabel: 'All unresolved'
  },
  'churn-analysis': {
    name: 'Churn analysis',
    description: 'Churned customers grouped by reason, with MRR lost per reason.',
    scopeLabel: 'All time'
  },
  'revenue-by-country': {
    name: 'Revenue by country',
    description: 'Transaction volume and fees collected broken down by ISO country code.',
    scopeLabel: 'Completed payments'
  }
} as const;

type ReportSlug = keyof typeof REPORTS;

const FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;

export interface ReportSchedule {
  frequency: typeof FREQUENCIES[number];
  recipients: string[];
  enabled: boolean;
  next_run?: string;
}

export const load: PageServerLoad = async ({ params, parent, locals }) => {
  const { permissions, org } = await parent();
  if (!permissions || !permissions['reports:read']) {
    error(403, { message: 'You do not have access to reports.' });
  }
  if (!org) error(403);

  const slug = params.slug as ReportSlug;
  const meta = REPORTS[slug];
  if (!meta) error(404, { message: `Unknown report: ${slug}` });

  // Load preview data + current schedule in parallel
  const [preview, settingsRow] = await Promise.all([
    loadPreview(locals.supabase, org.org_id, slug),
    locals.supabase.from('organizations').select('settings').eq('id', org.org_id).maybeSingle()
  ]);

  const allSchedules = ((settingsRow.data?.settings as { report_schedules?: Record<string, ReportSchedule> } | null)
    ?.report_schedules) ?? {};
  const schedule: ReportSchedule = allSchedules[slug] ?? {
    frequency: 'weekly',
    recipients: [],
    enabled: false
  };

  return {
    slug,
    meta,
    preview,
    schedule,
    canExport: permissions?.['reports:export'] === true,
    canSchedule: permissions?.['reports:create'] === true
  };
};

async function loadPreview(supabase: App.Locals['supabase'], orgId: string, slug: ReportSlug) {
  switch (slug) {
    case 'monthly-summary': {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from('mrr_snapshots')
        .select('snapshot_date, mrr, new_mrr, churned_mrr')
        .eq('org_id', orgId)
        .gte('snapshot_date', since)
        .order('snapshot_date', { ascending: false })
        .limit(10);
      return {
        kind: 'table' as const,
        columns: ['Date', 'MRR', 'New MRR', 'Churned MRR'],
        rows: (data ?? []).map((r) => [
          (r as { snapshot_date: string }).snapshot_date,
          `$${Number((r as { mrr: number }).mrr).toLocaleString()}`,
          `$${Number((r as { new_mrr: number }).new_mrr).toLocaleString()}`,
          `$${Number((r as { churned_mrr: number }).churned_mrr).toLocaleString()}`
        ])
      };
    }
    case 'fraud-report': {
      const { data } = await supabase
        .from('fraud_signals')
        .select('signal_type, severity, score, resolved, created_at')
        .eq('org_id', orgId)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);
      return {
        kind: 'table' as const,
        columns: ['Signal', 'Severity', 'Score', 'Created'],
        rows: (data ?? []).map((r) => [
          String((r as { signal_type: string }).signal_type ?? ''),
          String((r as { severity: string }).severity ?? ''),
          String((r as { score: number }).score ?? ''),
          new Date((r as { created_at: string }).created_at).toLocaleDateString()
        ])
      };
    }
    case 'churn-analysis': {
      const { data } = await supabase
        .from('churn_events')
        .select('reason, mrr_lost, churned_at')
        .eq('org_id', orgId)
        .order('churned_at', { ascending: false })
        .limit(10);
      return {
        kind: 'table' as const,
        columns: ['Date', 'Reason', 'MRR lost'],
        rows: (data ?? []).map((r) => [
          new Date((r as { churned_at: string }).churned_at).toLocaleDateString(),
          String((r as { reason: string | null }).reason ?? 'no_reason'),
          `$${Number((r as { mrr_lost: number | null }).mrr_lost ?? 0).toFixed(2)}`
        ])
      };
    }
    case 'revenue-by-country': {
      const { data } = await supabase
        .from('transactions')
        .select('country_code, amount, fee_amount')
        .eq('org_id', orgId)
        .eq('status', 'completed');
      const buckets: Record<string, { txns: number; volume: number; fees: number }> = {};
      for (const r of (data ?? []) as Array<{ country_code: string | null; amount: number; fee_amount: number }>) {
        const cc = r.country_code ?? 'XX';
        buckets[cc] = buckets[cc] ?? { txns: 0, volume: 0, fees: 0 };
        buckets[cc].txns++;
        buckets[cc].volume += Number(r.amount);
        buckets[cc].fees += Number(r.fee_amount);
      }
      const rows = Object.entries(buckets)
        .map(([country, b]) => [country, b.txns, b.volume, b.fees] as [string, number, number, number])
        .sort((a, b) => b[2] - a[2])
        .slice(0, 10)
        .map((row) => [
          row[0],
          row[1].toLocaleString(),
          `$${row[2].toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          `$${row[3].toLocaleString(undefined, { maximumFractionDigits: 2 })}`
        ]);
      return {
        kind: 'table' as const,
        columns: ['Country', 'Transactions', 'Volume', 'Fees'],
        rows
      };
    }
  }
}

const ScheduleSchema = z.object({
  frequency: z.enum(FREQUENCIES),
  recipients: z.string().max(2000),
  enabled: z.coerce.boolean()
});

function parseRecipients(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,\s\n]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export const actions: Actions = {
  saveSchedule: async ({ params, request, locals }) => {
    if (!locals.user) error(401);
    const org = await getOrgMembership(locals.supabase, locals.user.id);
    if (!org) error(403);
    const perms = await resolvePermissions(locals.supabase, locals.user.id, org.org_id);
    if (!perms['reports:create']) {
      return fail(403, { error: 'You need reports:create to schedule reports.' });
    }

    const slug = params.slug as ReportSlug;
    if (!REPORTS[slug]) return fail(404, { error: 'Unknown report.' });

    const fd = await request.formData();
    const parsed = ScheduleSchema.safeParse({
      frequency: fd.get('frequency'),
      recipients: fd.get('recipients') ?? '',
      enabled: fd.get('enabled') ? 'true' : 'false'
    });
    if (!parsed.success) {
      return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid input.' });
    }

    const recipients = parseRecipients(parsed.data.recipients);
    const invalid = recipients.find((r) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));
    if (invalid) return fail(400, { error: `Invalid email: ${invalid}` });

    // Compute next_run (relative to now) — purely informational for the demo
    const now = new Date();
    const next = new Date(now);
    if (parsed.data.frequency === 'daily') next.setDate(next.getDate() + 1);
    else if (parsed.data.frequency === 'weekly') next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);

    const schedule: ReportSchedule = {
      frequency: parsed.data.frequency,
      recipients,
      enabled: parsed.data.enabled,
      next_run: next.toISOString()
    };

    // Merge into organizations.settings.report_schedules
    const { data: cur } = await locals.supabase
      .from('organizations')
      .select('settings')
      .eq('id', org.org_id)
      .maybeSingle();
    const settings = (cur?.settings as Record<string, unknown> | null) ?? {};
    const schedules = (settings.report_schedules as Record<string, ReportSchedule>) ?? {};
    const updated: Record<string, unknown> = {
      ...settings,
      report_schedules: { ...schedules, [slug]: schedule }
    };

    const { error: e } = await locals.supabase
      .from('organizations')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ settings: updated as any, updated_at: new Date().toISOString() })
      .eq('id', org.org_id);
    if (e) return fail(500, { error: e.message });

    await locals.supabase.from('audit_log').insert({
      org_id: org.org_id,
      actor_id: locals.user.id,
      actor_email: locals.user.email,
      action: 'report.scheduled',
      resource: 'reports',
      new_values: { slug, frequency: schedule.frequency, recipients: schedule.recipients.length }
    });

    return { success: true };
  },

  removeSchedule: async ({ params, locals }) => {
    if (!locals.user) error(401);
    const org = await getOrgMembership(locals.supabase, locals.user.id);
    if (!org) error(403);
    const perms = await resolvePermissions(locals.supabase, locals.user.id, org.org_id);
    if (!perms['reports:create']) {
      return fail(403, { error: 'You need reports:create to remove schedules.' });
    }

    const slug = params.slug as ReportSlug;

    const { data: cur } = await locals.supabase
      .from('organizations')
      .select('settings')
      .eq('id', org.org_id)
      .maybeSingle();
    const settings = (cur?.settings as Record<string, unknown> | null) ?? {};
    const schedules = { ...((settings.report_schedules as Record<string, ReportSchedule>) ?? {}) };
    delete schedules[slug];
    const updated: Record<string, unknown> = { ...settings, report_schedules: schedules };

    const { error: e } = await locals.supabase
      .from('organizations')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ settings: updated as any, updated_at: new Date().toISOString() })
      .eq('id', org.org_id);
    if (e) return fail(500, { error: e.message });

    return { removed: true };
  }
};
