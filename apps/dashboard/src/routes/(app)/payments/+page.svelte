<script lang="ts">
  import { CreditCard, Banknote, Wallet, Coins } from '@lucide/svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import DonutChart from '$lib/components/charts/DonutChart.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { formatCurrency, formatRelativeDate } from '$lib/utils/formatters';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  interface Txn {
    id: string;
    reference: string;
    status: string;
    amount: number;
    fee_amount: number;
    currency: string;
    payment_method: string | null;
    channel: string | null;
    created_at: string;
    customers: { full_name: string; company: string | null } | null;
  }

  const recent = $derived(data.recent as unknown as Txn[]);

  const methodMixData = $derived(
    Object.entries(data.methodMix).map(([label, value]) => ({ label, value }))
  );
  const providerMixData = $derived(
    Object.entries(data.providerMix)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }))
  );

  const METHOD_ICONS: Record<string, typeof CreditCard> = {
    card: CreditCard,
    bank_account: Banknote,
    wallet: Wallet,
    crypto: Coins
  };

  function iconFor(t: string) {
    return METHOD_ICONS[t] ?? CreditCard;
  }
</script>

<svelte:head><title>Payments · VaultFlow</title></svelte:head>

<header class="mb-6">
  <h1 class="text-2xl font-semibold tracking-tight">Payments</h1>
  <p class="mt-1 text-sm text-muted">Payment-flow data for the last 30 days.</p>
</header>

<!-- KPI strip -->
<div class="grid gap-3 md:grid-cols-4">
  <Card class="p-5">
    <div class="text-sm font-medium text-muted">Volume (30d)</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
      {formatCurrency(data.volume, 'USD', { compact: true })}
    </div>
    <div class="mt-1 text-xs text-subtle">{data.completedCount.toLocaleString()} completed</div>
  </Card>
  <Card class="p-5">
    <div class="text-sm font-medium text-muted">Success rate</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
      {(data.successRate * 100).toFixed(1)}%
    </div>
    <div class="mt-1 text-xs {data.failedCount > 0 ? 'text-warning' : 'text-subtle'}">
      {data.failedCount.toLocaleString()} failed
    </div>
  </Card>
  <Card class="p-5">
    <div class="text-sm font-medium text-muted">Fees collected</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
      {formatCurrency(data.fees, 'USD', { compact: true })}
    </div>
  </Card>
  <Card class="p-5">
    <div class="text-sm font-medium text-muted">Total payments</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
      {data.totalPayments.toLocaleString()}
    </div>
  </Card>
</div>

<!-- Method + provider mix -->
<div class="mt-6 grid gap-6 lg:grid-cols-2">
  <Card class="p-5">
    <h2 class="mb-1 text-base font-semibold">Method mix</h2>
    <p class="mb-4 text-xs text-muted">Saved payment methods by type</p>
    {#if methodMixData.length}
      <DonutChart
        data={methodMixData}
        label="Method mix"
        centerLabel="Methods"
        centerValue={String(methodMixData.reduce((s, d) => s + d.value, 0))}
      />
    {:else}
      <p class="py-8 text-center text-sm text-muted">No saved payment methods.</p>
    {/if}
  </Card>

  <Card class="p-5">
    <h2 class="mb-1 text-base font-semibold">Provider breakdown</h2>
    <p class="mb-4 text-xs text-muted">Saved methods by issuer / processor</p>
    {#if providerMixData.length}
      <ul class="space-y-2">
        {#each providerMixData as p (p.label)}
          {@const total = providerMixData.reduce((s, x) => s + x.value, 0)}
          {@const pct = total > 0 ? (p.value / total) * 100 : 0}
          <li>
            <div class="mb-1 flex items-center justify-between text-xs">
              <span class="font-medium capitalize">{p.label}</span>
              <span class="font-mono tabular-nums text-muted">{p.value} · {pct.toFixed(1)}%</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div class="h-full rounded-full bg-[var(--primary)]" style="width: {pct}%"></div>
            </div>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="py-8 text-center text-sm text-muted">No provider data.</p>
    {/if}
  </Card>
</div>

<!-- Recent payments -->
<Card class="mt-6">
  <div class="border-b border-default px-5 py-3">
    <h2 class="text-base font-semibold">Recent payments</h2>
    <p class="text-xs text-muted">Last 15 — visit /transactions for the full ledger</p>
  </div>
  {#if recent.length === 0}
    <div class="px-6 py-12 text-center text-sm text-muted">No payments in the last 30 days.</div>
  {:else}
    <ul class="divide-y divide-[var(--color-border-subtle)]">
      {#each recent as t (t.id)}
        {@const Icon = iconFor(t.payment_method ?? '')}
        <li class="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div class="flex min-w-0 items-center gap-3">
            <div class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-3">
              <Icon class="h-4 w-4 text-muted" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <a href={`/transactions?txn=${t.id}`} class="block truncate font-mono text-sm hover:underline">
                {t.reference}
              </a>
              <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-subtle">
                {#if t.customers}
                  <span class="truncate">{t.customers.full_name}</span>
                  <span aria-hidden="true">·</span>
                {/if}
                {#if t.channel}<Badge tone="neutral">{t.channel}</Badge>{/if}
                <span>{formatRelativeDate(t.created_at)}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <div class="font-mono text-sm font-medium tabular-nums">
                {formatCurrency(Number(t.amount), t.currency)}
              </div>
              {#if Number(t.fee_amount) > 0}
                <div class="text-xs text-subtle">
                  −{formatCurrency(Number(t.fee_amount), t.currency)} fee
                </div>
              {/if}
            </div>
            <StatusBadge status={t.status} kind="transaction" />
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</Card>
