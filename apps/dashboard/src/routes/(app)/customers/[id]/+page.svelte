<script lang="ts">
  import { ArrowLeft, Mail, Globe, Briefcase, TrendingUp } from '@lucide/svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { formatCurrency, formatDate, formatRelativeDate } from '$lib/utils/formatters';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const c = $derived(data.customer);

  function field<T = unknown>(k: string): T { return c[k] as T; }

  interface SubRow {
    id: string;
    status: string;
    mrr: number;
    current_period_start: string;
    current_period_end: string;
    plans: { name: string } | null;
  }
  interface InvRow {
    id: string;
    number: string;
    status: string;
    amount_due: number;
    amount_paid: number;
    currency: string;
    due_date: string | null;
    paid_at: string | null;
  }
  interface TxnRow {
    id: string;
    reference: string;
    type: string;
    status: string;
    amount: number;
    currency: string;
    created_at: string;
  }

  const subs = $derived(data.subscriptions as unknown as SubRow[]);
  const invs = $derived(data.invoices as unknown as InvRow[]);
  const txns = $derived(data.transactions as unknown as TxnRow[]);
</script>

<svelte:head><title>{field<string>('full_name')} · VaultFlow</title></svelte:head>

<a href="/customers" class="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
  <ArrowLeft class="h-4 w-4" /> All customers
</a>

<header class="mb-6 flex flex-wrap items-start justify-between gap-4">
  <div class="min-w-0">
    <h1 class="truncate text-2xl font-semibold tracking-tight">{field<string>('full_name')}</h1>
    <div class="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted">
      <span class="inline-flex items-center gap-1"><Mail class="h-3.5 w-3.5" />{field<string>('email')}</span>
      {#if field<string>('company')}
        <span class="inline-flex items-center gap-1"><Briefcase class="h-3.5 w-3.5" />{field<string>('company')}</span>
      {/if}
      {#if field<string>('country_code')}
        <span class="inline-flex items-center gap-1"><Globe class="h-3.5 w-3.5" /><span class="font-mono">{field<string>('country_code')}</span></span>
      {/if}
    </div>
  </div>
  <StatusBadge status={field<string>('status')} kind="customer" />
</header>

<div class="grid gap-4 md:grid-cols-3">
  <Card class="p-5">
    <div class="text-sm font-medium text-muted">Lifetime value</div>
    <div class="mt-2 font-mono text-2xl font-semibold tabular-nums">
      {formatCurrency(field<number>('ltv') ?? 0)}
    </div>
  </Card>
  <Card class="p-5">
    <div class="text-sm font-medium text-muted">MRR</div>
    <div class="mt-2 font-mono text-2xl font-semibold tabular-nums">
      {formatCurrency(field<number>('mrr') ?? 0)}
    </div>
  </Card>
  <Card class="p-5">
    <div class="text-sm font-medium text-muted">Churn risk</div>
    <div class="mt-2 flex items-baseline gap-2">
      <span class="font-mono text-2xl font-semibold tabular-nums">
        {field<number>('risk_score')?.toFixed(0) ?? '—'}
      </span>
      {#if field<number>('risk_score') !== null && field<number>('risk_score') !== undefined}
        {@const r = field<number>('risk_score')}
        <Badge tone={r < 30 ? 'success' : r < 60 ? 'warning' : 'danger'}>
          {r < 30 ? 'low' : r < 60 ? 'medium' : 'high'}
        </Badge>
      {/if}
    </div>
  </Card>
</div>

<div class="mt-6 grid gap-4 lg:grid-cols-2">
  <Card class="p-5">
    <h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Subscriptions</h2>
    {#if subs.length === 0}
      <p class="text-sm text-muted">No active subscriptions.</p>
    {:else}
      <ul class="space-y-2">
        {#each subs as s (s.id)}
          <li class="flex items-center justify-between rounded-md border border-default bg-surface-2 p-3 text-sm">
            <div>
              <div class="font-medium">{s.plans?.name ?? '—'}</div>
              <div class="text-xs text-muted">
                Period {formatDate(s.current_period_start)} – {formatDate(s.current_period_end)}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-mono tabular-nums">{formatCurrency(Number(s.mrr))}/mo</span>
              <StatusBadge status={s.status} kind="subscription" />
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </Card>

  <Card class="p-5">
    <h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Recent invoices</h2>
    {#if invs.length === 0}
      <p class="text-sm text-muted">No invoices yet.</p>
    {:else}
      <ul class="space-y-2">
        {#each invs as inv (inv.id)}
          <li class="flex items-center justify-between rounded-md border border-default bg-surface-2 p-3 text-sm">
            <div>
              <div class="font-mono text-xs">{inv.number}</div>
              <div class="text-xs text-muted">
                {inv.paid_at ? `Paid ${formatRelativeDate(inv.paid_at)}` : `Due ${inv.due_date ?? '—'}`}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-mono tabular-nums">{formatCurrency(Number(inv.amount_due), inv.currency)}</span>
              <StatusBadge status={inv.status} kind="invoice" />
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </Card>

  <Card class="p-5 lg:col-span-2">
    <h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Recent transactions</h2>
    {#if txns.length === 0}
      <p class="text-sm text-muted">No transactions in the last 90 days.</p>
    {:else}
      <ul class="divide-y divide-[var(--color-border-subtle)]">
        {#each txns as tx (tx.id)}
          <li class="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div class="min-w-0">
              <a href="/transactions?txn={tx.id}" class="block font-mono text-xs hover:text-brand-300">{tx.reference}</a>
              <div class="text-xs text-muted">{formatRelativeDate(tx.created_at)} · <span class="capitalize">{tx.type}</span></div>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-mono tabular-nums">{formatCurrency(Number(tx.amount), tx.currency)}</span>
              <StatusBadge status={tx.status} kind="transaction" />
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </Card>
</div>
