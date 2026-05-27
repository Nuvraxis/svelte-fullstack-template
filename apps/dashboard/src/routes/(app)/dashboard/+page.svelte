<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { ArrowUp, ArrowDown, ShieldAlert, Activity } from '@lucide/svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import SparkLine from '$lib/components/charts/SparkLine.svelte';
  import LineChart from '$lib/components/charts/LineChart.svelte';
  import DonutChart from '$lib/components/charts/DonutChart.svelte';
  import { formatCurrency, formatNumber, formatPercent, formatRelativeDate } from '$lib/utils/formatters';
  import { getBrowserClient } from '$lib/supabase';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const user = $derived(page.data.user);
  const orgId = $derived(page.data.org?.org_id);

  const k = $derived(data.kpis);
  const successRate = $derived(k.txCount > 0 ? (k.successCount / k.txCount) * 100 : 0);
  const avgTxValue = $derived(k.successCount > 0 ? k.volume30d / k.successCount : 0);
  const volumeDelta = $derived(
    k.volumePrev > 0 ? ((k.volume30d - k.volumePrev) / k.volumePrev) * 100 : 0
  );

  // MRR trend mini sparkline + line chart
  const mrrPoints = $derived(
    data.mrrSnapshots.map((s) => ({
      label: String(s.snapshot_date).slice(5),
      value: Number(s.mrr)
    }))
  );
  const mrrValues = $derived(mrrPoints.map((p) => p.value));

  const currentMrr = $derived(mrrValues.length ? mrrValues[mrrValues.length - 1] ?? 0 : 0);
  const startMrr = $derived(mrrValues.length ? mrrValues[0] ?? 0 : 0);
  const mrrDelta = $derived(startMrr > 0 ? ((currentMrr - startMrr) / startMrr) * 100 : 0);
  const activeSubs = $derived(
    data.mrrSnapshots.length
      ? data.mrrSnapshots[data.mrrSnapshots.length - 1]!.active_subscriptions
      : 0
  );

  // Status donut data
  const statusData = $derived(
    Object.entries(data.statusBreakdown).map(([label, value]) => ({ label, value }))
  );

  // Recent transactions feed — augmented with realtime inserts on the client
  type FeedItem = {
    id: string;
    reference: string;
    type: string;
    status: string;
    amount: number;
    currency: string;
    customer_id: string | null;
    customer_name?: string;
    created_at: string;
    isNew?: boolean;
  };

  let liveFeed = $state<FeedItem[]>([]);

  onMount(() => {
    // Seed from server-loaded data, then watch for inserts
    liveFeed = data.recentTransactions.map((t) => ({
      ...(t as FeedItem),
      customer_name: t.customer_id ? data.recentCustomersById[t.customer_id]?.full_name : undefined
    }));

    if (!orgId) return;
    const sb = getBrowserClient();
    const ch = sb
      .channel(`org-${orgId}-txns`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `org_id=eq.${orgId}` },
        (payload) => {
          const row = payload.new as FeedItem;
          liveFeed = [{ ...row, isNew: true }, ...liveFeed].slice(0, 10);
          setTimeout(() => {
            liveFeed = liveFeed.map((t) => (t.id === row.id ? { ...t, isNew: false } : t));
          }, 1500);
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  });

  const fraudAlertCount = $derived(k.fraudUnresolved);
</script>

<svelte:head><title>Dashboard · VaultFlow</title></svelte:head>

<header class="mb-6">
  <h1 class="text-2xl font-semibold tracking-tight">
    Welcome back, {user?.full_name?.split(' ')[0] ?? 'there'}
  </h1>
  <p class="mt-1 text-sm text-muted">Here's what's happening across the org in the last 30 days.</p>
</header>

<!-- Fintech KPI row -->
<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <Card class="p-5">
    <div class="flex items-start justify-between">
      <div>
        <div class="text-sm font-medium text-muted">Total volume</div>
        <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
          {formatCurrency(k.volume30d, 'USD', { compact: true })}
        </div>
      </div>
      <SparkLine data={mrrValues.slice(-14)} width={70} height={28} />
    </div>
    <div class="mt-2 flex items-center gap-1.5 text-xs">
      {#if volumeDelta >= 0}
        <ArrowUp class="h-3 w-3 text-success" aria-hidden="true" />
        <span class="text-success">{formatPercent(volumeDelta)}</span>
      {:else}
        <ArrowDown class="h-3 w-3 text-danger" aria-hidden="true" />
        <span class="text-danger">{formatPercent(volumeDelta)}</span>
      {/if}
      <span class="text-subtle">vs previous 30 days</span>
    </div>
  </Card>

  <Card class="p-5">
    <div class="text-sm font-medium text-muted">Successful transactions</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
      {formatNumber(k.successCount)}
    </div>
    <div class="mt-2 text-xs text-subtle">
      <span class="font-mono tabular-nums text-foreground">{successRate.toFixed(1)}%</span> success rate
    </div>
  </Card>

  <Card class="p-5">
    <div class="text-sm font-medium text-muted">Average transaction</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
      {formatCurrency(avgTxValue, 'USD')}
    </div>
    <div class="mt-2 text-xs text-subtle">across completed payments</div>
  </Card>

  <Card class="p-5">
    <div class="flex items-start justify-between">
      <div>
        <div class="text-sm font-medium text-muted">Fees collected</div>
        <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
          {formatCurrency(k.feesCollected, 'USD', { compact: true })}
        </div>
      </div>
      {#if fraudAlertCount > 0}
        <Badge tone="danger">
          <ShieldAlert class="h-3 w-3" />
          {fraudAlertCount}
        </Badge>
      {/if}
    </div>
    <div class="mt-2 text-xs text-subtle">
      {fraudAlertCount > 0 ? `${fraudAlertCount} unresolved fraud alerts` : 'no active fraud alerts'}
    </div>
  </Card>
</div>

<!-- SaaS KPI row -->
<div class="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <Card class="p-5">
    <div class="text-sm font-medium text-muted">MRR</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
      {formatCurrency(currentMrr, 'USD', { compact: true })}
    </div>
    <div class="mt-2 flex items-center gap-1.5 text-xs">
      <Badge tone={mrrDelta >= 0 ? 'success' : 'danger'}>{formatPercent(mrrDelta)}</Badge>
      <span class="text-subtle">past 30 days</span>
    </div>
  </Card>

  <Card class="p-5">
    <div class="text-sm font-medium text-muted">ARR (projected)</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
      {formatCurrency(currentMrr * 12, 'USD', { compact: true })}
    </div>
    <div class="mt-2 text-xs text-subtle">12 × current MRR</div>
  </Card>

  <Card class="p-5">
    <div class="text-sm font-medium text-muted">Active subscriptions</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">{formatNumber(activeSubs)}</div>
  </Card>

  <Card class="p-5">
    <div class="text-sm font-medium text-muted">Transactions (30d)</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">{formatNumber(k.txCount)}</div>
  </Card>
</div>

<!-- MRR chart + status donut -->
<div class="mt-6 grid gap-6 lg:grid-cols-3">
  <Card class="p-5 lg:col-span-2">
    <h2 class="mb-1 text-base font-semibold">Revenue over time</h2>
    <p class="mb-4 text-xs text-muted">Daily MRR — past 30 days</p>
    {#if mrrPoints.length}
      <LineChart
        data={mrrPoints}
        label="Revenue over time"
        height={240}
        yFormat={(v) => formatCurrency(v, 'USD', { compact: true })}
      />
    {:else}
      <p class="py-12 text-center text-sm text-muted">No MRR snapshots yet.</p>
    {/if}
  </Card>

  <Card class="p-5">
    <h2 class="mb-1 text-base font-semibold">Status breakdown</h2>
    <p class="mb-4 text-xs text-muted">Transactions by status (30d)</p>
    {#if statusData.length}
      <DonutChart
        data={statusData}
        label="Transaction status breakdown"
        size={170}
        centerLabel="Total"
        centerValue={formatNumber(statusData.reduce((s, d) => s + d.value, 0))}
      />
    {:else}
      <p class="py-12 text-center text-sm text-muted">No data yet.</p>
    {/if}
  </Card>
</div>

<!-- Realtime feed + top customers -->
<div class="mt-6 grid gap-6 lg:grid-cols-3">
  <Card class="p-5 lg:col-span-2">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-base font-semibold">Live transactions</h2>
        <p class="text-xs text-muted">Updates in real time via Supabase Realtime</p>
      </div>
      <span class="inline-flex items-center gap-1.5 text-xs text-success">
        <Activity class="h-3 w-3 animate-pulse" /> Live
      </span>
    </div>
    <ul class="divide-y divide-[var(--color-border-subtle)]" data-testid="live-feed">
      {#each liveFeed as t (t.id)}
        <li class="flex flex-col items-start gap-1.5 py-2.5 text-sm transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-3 {t.isNew ? 'animate-pulse bg-brand-600/10' : ''}">
          <div class="min-w-0 w-full sm:w-auto">
            <a href="/transactions?txn={t.id}" class="block font-mono text-xs hover:text-brand-300">
              {t.reference}
            </a>
            <div class="truncate text-xs text-muted">
              {t.customer_name ?? '—'} · <span class="capitalize">{t.type}</span> · {formatRelativeDate(t.created_at)}
            </div>
          </div>
          <div class="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <span class="font-mono tabular-nums">{formatCurrency(Number(t.amount), t.currency)}</span>
            <StatusBadge status={t.status} kind="transaction" />
          </div>
        </li>
      {/each}
    </ul>
  </Card>

  <Card class="p-5">
    <h2 class="mb-1 text-base font-semibold">Top customers</h2>
    <p class="mb-4 text-xs text-muted">By lifetime value</p>
    <ul class="space-y-3">
      {#each data.topCustomers as c (c.id)}
        <li>
          <a
            href={`/customers/${c.id}`}
            class="flex items-center justify-between gap-2 rounded-md p-2 -mx-2 transition-colors hover:bg-surface-2"
          >
            <div class="min-w-0">
              <div class="truncate text-sm font-medium">{c.full_name}</div>
              <div class="truncate text-xs text-muted">{c.company ?? c.email}</div>
            </div>
            <span class="font-mono text-xs tabular-nums">{formatCurrency(Number(c.ltv), 'USD', { compact: true })}</span>
          </a>
        </li>
      {/each}
    </ul>
  </Card>
</div>
