<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import DataTable from '$lib/components/data-table/DataTable.svelte';
  import type { ColumnDef } from '$lib/components/data-table/types';
  import Card from '$lib/components/ui/Card.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { formatCurrency, formatDate } from '$lib/utils/formatters';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  interface SubRow {
    id: string;
    status: string;
    mrr: number;
    current_period_start: string;
    current_period_end: string;
    trial_end: string | null;
    canceled_at: string | null;
    customer_id: string;
    customers: { full_name: string; email: string };
    plans: { name: string; interval: string };
    created_at: string;
  }

  const rows = $derived(data.subscriptions as unknown as SubRow[]);
  const planSummary = $derived(Object.values(data.planMrr));
  const totalActive = $derived(planSummary.reduce((s, p) => s + p.count, 0));

  function updateUrl(u: Record<string, string | null>) {
    const params = new URLSearchParams(page.url.searchParams);
    for (const [k, v] of Object.entries(u)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in u)) params.delete('page');
    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
  }
</script>

{#snippet customerCell({ row }: { value: unknown; row: SubRow })}
  <div class="min-w-0">
    <a href={`/customers/${row.customer_id}`} class="block truncate font-medium hover:text-brand-300">
      {row.customers.full_name}
    </a>
    <div class="truncate text-xs text-muted">{row.customers.email}</div>
  </div>
{/snippet}

{#snippet planCell({ row }: { value: unknown; row: SubRow })}
  <div>
    <div class="font-medium">{row.plans.name}</div>
    <div class="text-xs text-muted capitalize">{row.plans.interval}</div>
  </div>
{/snippet}

{#snippet statusCell({ value }: { value: unknown; row: SubRow })}
  <StatusBadge status={String(value)} kind="subscription" />
{/snippet}

{#snippet mrrCell({ value }: { value: unknown; row: SubRow })}
  <span class="font-mono tabular-nums">{formatCurrency(Number(value))}</span>
{/snippet}

{#snippet renewalCell({ value }: { value: unknown; row: SubRow })}
  <span class="text-muted">{formatDate(String(value))}</span>
{/snippet}

<svelte:head><title>Subscriptions · VaultFlow</title></svelte:head>

<header class="mb-6">
  <h1 class="text-2xl font-semibold tracking-tight">Subscriptions</h1>
  <p class="mt-1 text-sm text-muted">
    {data.total.toLocaleString()} total · {totalActive} active
  </p>
</header>

<!-- Plan MRR strip -->
{#if planSummary.length > 0}
  <div class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {#each planSummary as p (p.name)}
      <Card class="p-4">
        <div class="text-xs font-medium uppercase tracking-wider text-muted">{p.name}</div>
        <div class="mt-1.5 font-mono text-xl font-semibold tabular-nums">
          {formatCurrency(p.mrr, 'USD', { compact: true })}
        </div>
        <div class="mt-0.5 text-xs text-subtle">{p.count} active</div>
      </Card>
    {/each}
  </div>
{/if}

<div class="mb-4">
  <select
    class="input-base text-sm"
    value={data.status ?? ''}
    onchange={(e) => updateUrl({ status: (e.currentTarget as HTMLSelectElement).value || null })}
    aria-label="Filter by status"
  >
    <option value="">All statuses</option>
    <option value="active">Active</option>
    <option value="trialing">Trialing</option>
    <option value="past_due">Past due</option>
    <option value="paused">Paused</option>
    <option value="canceled">Canceled</option>
    <option value="unpaid">Unpaid</option>
  </select>
</div>

{#snippet tableSection()}
  {@const columns: ColumnDef<SubRow>[] = [
    { id: 'customer', header: 'Customer', accessor: 'customer_id', cell: customerCell },
    { id: 'plan',     header: 'Plan',     accessor: (r) => r.plans.name, cell: planCell, width: '140px' },
    { id: 'status',   header: 'Status',   accessor: 'status', cell: statusCell, width: '130px' },
    { id: 'mrr',      header: 'MRR',      accessor: 'mrr',    cell: mrrCell, align: 'right', width: '120px' },
    { id: 'renewal',  header: 'Renews',   accessor: 'current_period_end', cell: renewalCell, align: 'right', width: '140px' }
  ]}
  <DataTable
    data={rows}
    {columns}
    total={data.total}
    page={data.page}
    pageSize={data.pageSize}
    onPageChange={(p) => updateUrl({ page: String(p) })}
    emptyTitle="No subscriptions"
    emptyDescription="Try a different filter or seed more data."
  />
{/snippet}

{@render tableSection()}
