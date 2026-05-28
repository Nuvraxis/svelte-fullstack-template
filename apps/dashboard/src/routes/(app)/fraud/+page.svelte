<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { ShieldCheck, ShieldAlert, ShieldX, AlertOctagon } from '@lucide/svelte';
  import DataTable from '$lib/components/data-table/DataTable.svelte';
  import type { ColumnDef } from '$lib/components/data-table/types';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { formatDate, formatCurrency } from '$lib/utils/formatters';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  interface SignalRow {
    id: string;
    transaction_id: string;
    signal_type: string;
    severity: string;
    score: number | null;
    details: Record<string, unknown>;
    resolved: boolean;
    resolved_at: string | null;
    created_at: string;
    transactions: {
      reference: string;
      amount: number;
      currency: string;
      status: string;
      customer_id: string | null;
      channel: string | null;
      country_code: string | null;
    };
  }

  const rows = $derived(data.signals as unknown as SignalRow[]);
  const canResolve = $derived(page.data.permissions?.['fraud:resolve'] === true);

  function updateUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(page.url.searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in updates)) params.delete('page');
    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
  }

  const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;
  const SEVERITY_ICONS = {
    critical: AlertOctagon,
    high: ShieldX,
    medium: ShieldAlert,
    low: ShieldCheck
  };
  const SEVERITY_TONE = {
    critical: 'text-danger',
    high: 'text-danger',
    medium: 'text-warning',
    low: 'text-muted'
  };
</script>

{#snippet refCell({ row }: { value: unknown; row: SignalRow })}
  <span class="font-mono text-xs">{row.transactions.reference}</span>
{/snippet}

{#snippet typeCell({ value }: { value: unknown; row: SignalRow })}
  <span class="capitalize">{String(value).replace(/_/g, ' ')}</span>
{/snippet}

{#snippet severityCell({ value }: { value: unknown; row: SignalRow })}
  <StatusBadge status={String(value)} kind="fraud" />
{/snippet}

{#snippet scoreCell({ value }: { value: unknown; row: SignalRow })}
  {#if value !== null}
    <span class="font-mono tabular-nums">{Number(value).toFixed(0)}</span>
  {:else}
    <span class="text-subtle">—</span>
  {/if}
{/snippet}

{#snippet amountCell({ row }: { value: unknown; row: SignalRow })}
  <span class="font-mono tabular-nums">
    {formatCurrency(row.transactions.amount, row.transactions.currency)}
  </span>
{/snippet}

{#snippet whenCell({ value }: { value: unknown; row: SignalRow })}
  <span class="tabular-nums text-muted">{formatDate(String(value), 'time')}</span>
{/snippet}

{#snippet actionsCell({ row }: { value: unknown; row: SignalRow })}
  {#if row.resolved}
    <span class="text-xs text-success">Resolved</span>
  {:else if canResolve}
    <form method="POST" action="?/resolve" use:enhance>
      <input type="hidden" name="signal_id" value={row.id} />
      <input type="hidden" name="resolution" value="legitimate" />
      <Button size="sm" variant="secondary" type="submit">Mark legitimate</Button>
    </form>
  {:else}
    <span class="text-xs text-subtle">—</span>
  {/if}
{/snippet}

<svelte:head><title>Fraud Detection · VaultFlow</title></svelte:head>

<header class="mb-6">
  <h1 class="text-2xl font-semibold tracking-tight">Fraud Detection</h1>
  <p class="mt-1 text-sm text-muted">
    {data.total.toLocaleString()} {data.showResolved ? 'total signals' : 'unresolved signals'}
  </p>
</header>

<!-- Severity KPI tiles (also act as filter chips) -->
<div class="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  {#each SEVERITY_ORDER as sev (sev)}
    {@const Icon = SEVERITY_ICONS[sev]}
    {@const count = data.severityCounts[sev] ?? 0}
    {@const isActive = data.severity === sev}
    <button
      type="button"
      class="card p-4 text-left transition-colors {isActive ? 'border-brand-400 ring-1 ring-brand-400' : 'hover:bg-surface-2'}"
      onclick={() => updateUrl({ severity: isActive ? null : sev })}
      aria-pressed={isActive}
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wider text-muted">{sev}</span>
        <Icon class="h-4 w-4 {SEVERITY_TONE[sev]}" aria-hidden="true" />
      </div>
      <div class="mt-2 font-mono text-2xl font-semibold tabular-nums">{count}</div>
    </button>
  {/each}
</div>

<div class="mb-4 flex flex-wrap items-center gap-2">
  <button
    type="button"
    class="btn-ghost text-xs"
    onclick={() => updateUrl({ resolved: data.showResolved ? null : '1' })}
    aria-pressed={data.showResolved}
  >
    {data.showResolved ? 'Hide resolved' : 'Show resolved'}
  </button>
  {#if data.severity}
    <button type="button" class="btn-ghost text-xs" onclick={() => updateUrl({ severity: null })}>
      Clear severity filter
    </button>
  {/if}
</div>

{#snippet tableSection()}
  {@const columns: ColumnDef<SignalRow>[] = [
    { id: 'reference',  header: 'Transaction', accessor: (r) => r.transactions.reference, cell: refCell, width: '180px' },
    { id: 'signal_type', header: 'Signal',     accessor: 'signal_type', cell: typeCell },
    { id: 'severity',   header: 'Severity',    accessor: 'severity',   cell: severityCell, width: '120px' },
    { id: 'score',      header: 'Score',       accessor: 'score',      cell: scoreCell, align: 'right', width: '80px' },
    { id: 'amount',     header: 'Amount',      accessor: (r) => r.transactions.amount, cell: amountCell, align: 'right', width: '140px' },
    { id: 'created_at', header: 'When',        accessor: 'created_at', cell: whenCell, align: 'right', width: '170px' },
    { id: 'actions',    header: '',            accessor: 'id',         cell: actionsCell, align: 'right', width: '180px' }
  ]}
  <DataTable
    data={rows}
    {columns}
    total={data.total}
    page={data.page}
    pageSize={data.pageSize}
    onPageChange={(p) => updateUrl({ page: String(p) })}
    emptyTitle={data.severity ? `No ${data.severity} signals` : 'No fraud signals'}
    emptyDescription="Either nothing's flagged, or you're filtering tightly."
  />
{/snippet}

{@render tableSection()}
