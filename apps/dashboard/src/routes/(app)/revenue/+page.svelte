<script lang="ts">
  import { goto } from '$app/navigation';
  import Card from '$lib/components/ui/Card.svelte';
  import LineChart from '$lib/components/charts/LineChart.svelte';
  import BarChart from '$lib/components/charts/BarChart.svelte';
  import DonutChart from '$lib/components/charts/DonutChart.svelte';
  import { formatCurrency, formatPercent } from '$lib/utils/formatters';
  import { cn } from '$lib/utils/cn';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  interface Snapshot {
    snapshot_date: string;
    mrr: number;
    new_mrr: number;
    expansion_mrr: number;
    contraction_mrr: number;
    churned_mrr: number;
    reactivation_mrr: number;
    total_customers: number;
    active_subscriptions: number;
  }

  const snapshots = $derived(data.snapshots as Snapshot[]);

  // MRR trend line
  const mrrTrend = $derived(
    snapshots.map((s) => ({
      label: s.snapshot_date.slice(5), // MM-DD
      value: Number(s.mrr)
    }))
  );

  // Aggregate the last range's totals for the waterfall
  const waterfall = $derived.by(() => {
    if (snapshots.length === 0) return [];
    const sum = (key: keyof Snapshot) =>
      snapshots.reduce((s, snap) => s + Number(snap[key] ?? 0), 0);

    const startMrr = Number(snapshots[0]!.mrr);
    const newM = sum('new_mrr');
    const exp = sum('expansion_mrr');
    const reac = sum('reactivation_mrr');
    const contr = -sum('contraction_mrr');
    const churn = -sum('churned_mrr');
    const endMrr = Number(snapshots[snapshots.length - 1]!.mrr);

    return [
      { label: 'Start',          value: startMrr, color: 'var(--color-info)' },
      { label: 'New',            value: newM,    color: 'var(--color-success)' },
      { label: 'Expansion',      value: exp,     color: 'var(--color-success)' },
      { label: 'Reactivation',   value: reac,    color: 'var(--color-success)' },
      { label: 'Contraction',    value: contr,   color: 'var(--color-warning)' },
      { label: 'Churn',          value: churn,   color: 'var(--color-danger)' },
      { label: 'End',            value: endMrr,  color: 'var(--color-brand-500)' }
    ];
  });

  // Churn by reason donut
  const churnData = $derived(
    Object.entries(data.churnByReason).map(([reason, info]) => ({
      label: reason,
      value: info.count
    }))
  );

  // Revenue by plan donut
  const planData = $derived(
    Object.entries(data.planRevenue).map(([name, mrr]) => ({
      label: name,
      value: Math.round(mrr)
    }))
  );

  // KPI deltas
  const currentMrr = $derived(snapshots.length ? Number(snapshots[snapshots.length - 1]!.mrr) : 0);
  const startMrr   = $derived(snapshots.length ? Number(snapshots[0]!.mrr) : 0);
  const deltaPct   = $derived(startMrr > 0 ? ((currentMrr - startMrr) / startMrr) * 100 : 0);
  const arr        = $derived(currentMrr * 12);
  const activeSubs = $derived(snapshots.length ? snapshots[snapshots.length - 1]!.active_subscriptions : 0);
  const customers  = $derived(snapshots.length ? snapshots[snapshots.length - 1]!.total_customers : 0);

  const RANGES = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: '12m', label: '12 months' }
  ] as const;

  function setRange(r: string) {
    goto(`?range=${r}`, { replaceState: false, noScroll: true });
  }

  const cohorts = $derived(data.cohorts ?? []);

  function cellStyle(value: number | null): string {
    if (value == null) return 'background: transparent; color: var(--muted-foreground);';
    // Map retention [0,1] to color: 1.0 → primary (deep), 0.5 → mid, < 0.5 → faded
    const alpha = Math.max(0.08, Math.min(0.95, value));
    return `background-color: color-mix(in oklch, var(--primary) ${Math.round(alpha * 100)}%, transparent); color: ${value > 0.55 ? 'var(--primary-foreground)' : 'var(--foreground)'};`;
  }
</script>

<svelte:head><title>Revenue · VaultFlow</title></svelte:head>

<header class="mb-6 flex flex-wrap items-end justify-between gap-3">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">Revenue analytics</h1>
    <p class="mt-1 text-sm text-muted">Subscription MRR, growth components, churn breakdown.</p>
  </div>
  <div class="flex items-center gap-1 rounded-md border border-default bg-surface-2 p-1">
    {#each RANGES as r (r.value)}
      <button
        type="button"
        class={cn(
          'rounded px-2.5 py-1 text-xs font-medium transition-colors',
          data.range === r.value ? 'bg-brand-600 text-white' : 'text-muted hover:bg-surface-3'
        )}
        onclick={() => setRange(r.value)}
        aria-pressed={data.range === r.value}
      >{r.label}</button>
    {/each}
  </div>
</header>

<!-- KPI strip -->
<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
  <Card class="p-5">
    <div class="text-sm font-medium text-muted">MRR</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
      {formatCurrency(currentMrr, 'USD', { compact: true })}
    </div>
    <div class="mt-1 text-xs {deltaPct >= 0 ? 'text-success' : 'text-danger'}">
      {formatPercent(deltaPct)} vs start of range
    </div>
  </Card>
  <Card class="p-5">
    <div class="text-sm font-medium text-muted">ARR (projected)</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
      {formatCurrency(arr, 'USD', { compact: true })}
    </div>
    <div class="mt-1 text-xs text-subtle">12 × current MRR</div>
  </Card>
  <Card class="p-5">
    <div class="text-sm font-medium text-muted">Active subscriptions</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">{activeSubs.toLocaleString()}</div>
  </Card>
  <Card class="p-5">
    <div class="text-sm font-medium text-muted">Customers</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">{customers.toLocaleString()}</div>
  </Card>
</div>

<!-- MRR trend -->
<Card class="mt-6 p-5">
  <h2 class="mb-1 text-base font-semibold">MRR over time</h2>
  <p class="mb-4 text-xs text-muted">Daily snapshot ending today</p>
  {#if mrrTrend.length}
    <LineChart
      data={mrrTrend}
      label="MRR over time"
      yFormat={(v) => formatCurrency(v, 'USD', { compact: true })}
    />
  {:else}
    <p class="py-8 text-center text-sm text-muted">No snapshots in this range.</p>
  {/if}
</Card>

<!-- Waterfall + donuts -->
<div class="mt-6 grid gap-6 lg:grid-cols-2">
  <Card class="p-5">
    <h2 class="mb-1 text-base font-semibold">MRR waterfall</h2>
    <p class="mb-4 text-xs text-muted">Composition of the change in MRR over the selected range</p>
    {#if waterfall.length}
      <BarChart
        data={waterfall}
        label="MRR waterfall"
        allowNegative
        yFormat={(v) => formatCurrency(v, 'USD', { compact: true })}
      />
    {/if}
  </Card>

  <Card class="p-5">
    <h2 class="mb-1 text-base font-semibold">Revenue by plan</h2>
    <p class="mb-4 text-xs text-muted">Current MRR contribution by plan</p>
    {#if planData.length}
      <DonutChart
        data={planData}
        label="Revenue by plan"
        centerLabel="Total MRR"
        centerValue={formatCurrency(planData.reduce((s, p) => s + p.value, 0), 'USD', { compact: true })}
      />
    {:else}
      <p class="py-8 text-center text-sm text-muted">No active subscriptions.</p>
    {/if}
  </Card>

  <Card class="p-5 lg:col-span-2">
    <h2 class="mb-1 text-base font-semibold">Cohort retention</h2>
    <p class="mb-4 text-xs text-muted">
      Customers grouped by signup month. Each cell is % of the cohort still active N months after signup.
    </p>
    {#if cohorts.length}
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-xs">
          <caption class="sr-only">Cohort retention table — rows are signup cohorts, columns are months since signup.</caption>
          <thead>
            <tr class="text-left text-muted">
              <th scope="col" class="px-2 py-2 font-medium">Cohort</th>
              <th scope="col" class="px-2 py-2 text-right font-medium">Size</th>
              {#each Array.from({ length: 12 }, (_, i) => i) as n (n)}
                <th scope="col" class="px-2 py-2 text-center font-mono font-medium">M{n}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each cohorts as cohort (cohort.monthKey)}
              <tr class="border-t border-default">
                <th scope="row" class="whitespace-nowrap px-2 py-1.5 text-left text-xs font-medium">{cohort.label}</th>
                <td class="px-2 py-1.5 text-right font-mono tabular-nums text-muted">{cohort.size}</td>
                {#each cohort.retention as v, i (i)}
                  <td class="px-1 py-1">
                    <div
                      class="rounded-sm py-1.5 text-center font-mono text-[11px] tabular-nums"
                      style={cellStyle(v)}
                      title={v == null ? '—' : `${(v * 100).toFixed(1)}%`}
                    >
                      {v == null ? '—' : `${Math.round(v * 100)}`}
                    </div>
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="py-8 text-center text-sm text-muted">No cohort data in this range.</p>
    {/if}
  </Card>

  <Card class="p-5 lg:col-span-2">
    <h2 class="mb-1 text-base font-semibold">Churn by reason</h2>
    <p class="mb-4 text-xs text-muted">Number of churn events in the selected range</p>
    {#if churnData.length}
      <DonutChart
        data={churnData}
        label="Churn by reason"
        centerLabel="Total churned"
        centerValue={String(churnData.reduce((s, c) => s + c.value, 0))}
      />
    {:else}
      <p class="py-8 text-center text-sm text-muted">No churn events in this range.</p>
    {/if}
  </Card>
</div>
