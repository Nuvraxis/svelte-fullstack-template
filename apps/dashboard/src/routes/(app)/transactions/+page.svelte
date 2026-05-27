<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { Download, X, RotateCcw } from '@lucide/svelte';
  import DataTable from '$lib/components/data-table/DataTable.svelte';
  import type { ColumnDef } from '$lib/components/data-table/types';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import { formatCurrency, formatDate } from '$lib/utils/formatters';
  import { toCsv, downloadCsv } from '$lib/utils/export';
  import TransactionDetail from './TransactionDetail.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  interface TxnRow {
    id: string;
    reference: string;
    type: string;
    status: string;
    amount: number;
    currency: string;
    fee_amount: number;
    customer_id: string | null;
    payment_method: string | null;
    channel: string | null;
    country_code: string | null;
    processed_at: string | null;
    created_at: string;
    flagged_reason: string | null;
  }

  const rows = $derived(data.transactions as TxnRow[]);
  const canExport = $derived(page.data.permissions?.['transactions:export'] === true);
  const canApprove = $derived(page.data.permissions?.['transactions:approve'] === true);

  let selectedRows = $state<Set<string>>(new Set());

  function customerName(customerId: string | null): string {
    if (!customerId) return '—';
    return data.customersById[customerId]?.full_name ?? '—';
  }

  function updateUrl(updates: Record<string, string | null>): void {
    const params = new URLSearchParams(page.url.searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    if (!('page' in updates)) params.delete('page');
    goto(`?${params.toString()}`, { replaceState: false, keepFocus: true, noScroll: true });
  }

  function handleSort(column: string): void {
    const current = data.sort;
    if (current.column === column) {
      updateUrl({ sort: column, dir: current.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      updateUrl({ sort: column, dir: 'desc' });
    }
  }

  const handlePage = (newPage: number) => updateUrl({ page: String(newPage) });
  const openDetail = (row: TxnRow) => updateUrl({ txn: row.id });
  const closeDetail = () => updateUrl({ txn: null });
  const resetFilters = () => goto('/transactions');

  function exportCsv(): void {
    const csv = toCsv(rows, [
      { header: 'Reference', accessor: 'reference' },
      { header: 'Type',      accessor: 'type' },
      { header: 'Status',    accessor: 'status' },
      { header: 'Amount',    accessor: (r) => r.amount.toFixed(2) },
      { header: 'Currency',  accessor: 'currency' },
      { header: 'Fee',       accessor: (r) => r.fee_amount.toFixed(2) },
      { header: 'Customer',  accessor: (r) => customerName(r.customer_id) },
      { header: 'Channel',   accessor: 'channel' },
      { header: 'Country',   accessor: 'country_code' },
      { header: 'Created',   accessor: (r) => new Date(r.created_at).toISOString() }
    ]);
    downloadCsv(`transactions-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }
</script>

{#snippet refCell({ row }: { value: unknown; row: TxnRow })}
  <span class="font-mono text-xs tabular-nums">{row.reference}</span>
{/snippet}

{#snippet customerCell({ row }: { value: unknown; row: TxnRow })}
  <div class="min-w-0">
    <div class="truncate font-medium">{customerName(row.customer_id)}</div>
    {#if row.customer_id && data.customersById[row.customer_id]}
      <div class="truncate text-xs text-muted">{data.customersById[row.customer_id].email}</div>
    {/if}
  </div>
{/snippet}

{#snippet typeCell({ value }: { value: unknown; row: TxnRow })}
  <span class="capitalize">{String(value)}</span>
{/snippet}

{#snippet statusCell({ value }: { value: unknown; row: TxnRow })}
  <StatusBadge status={String(value)} kind="transaction" />
{/snippet}

{#snippet amountCell({ row }: { value: unknown; row: TxnRow })}
  <span class="font-mono tabular-nums" class:text-danger={row.type === 'refund' || row.amount < 0}>
    {formatCurrency(row.amount, row.currency)}
  </span>
{/snippet}

{#snippet dateCell({ value }: { value: unknown; row: TxnRow })}
  <span class="tabular-nums text-muted">{formatDate(String(value), 'time')}</span>
{/snippet}

{#snippet channelCell({ value }: { value: unknown; row: TxnRow })}
  <span class="text-muted capitalize">{value ?? '—'}</span>
{/snippet}

{#snippet countryCell({ value }: { value: unknown; row: TxnRow })}
  <span class="font-mono text-xs uppercase">{value ?? '—'}</span>
{/snippet}

<svelte:head><title>Transactions · VaultFlow</title></svelte:head>

<header class="mb-6 flex flex-wrap items-end justify-between gap-3">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">Transactions</h1>
    <p class="mt-1 text-sm text-muted">
      {data.total.toLocaleString()} total · showing {rows.length} on this page
    </p>
  </div>
  <div class="flex items-center gap-2">
    {#if canExport}
      <Button variant="secondary" onclick={exportCsv} data-testid="export-button">
        <Download class="h-4 w-4" /> Export CSV
      </Button>
    {/if}
  </div>
</header>

<!-- Filter bar -->
<div class="mb-4 flex flex-wrap items-center gap-2">
  <Input
    type="search"
    name="q"
    placeholder="Search reference…"
    class="w-full sm:w-56"
    value={data.filters.search ?? ''}
    onchange={(e) => updateUrl({ q: (e.currentTarget as HTMLInputElement).value })}
    aria-label="Search by reference"
  />

  <select
    class="input-base text-sm"
    value={data.filters.status ?? ''}
    onchange={(e) => updateUrl({ status: (e.currentTarget as HTMLSelectElement).value || null })}
    aria-label="Filter by status"
    data-testid="filter-status"
  >
    <option value="">All statuses</option>
    <option value="completed">Completed</option>
    <option value="processing">Processing</option>
    <option value="pending">Pending</option>
    <option value="failed">Failed</option>
    <option value="reversed">Reversed</option>
    <option value="flagged">Flagged</option>
  </select>

  <select
    class="input-base text-sm"
    value={data.filters.type ?? ''}
    onchange={(e) => updateUrl({ type: (e.currentTarget as HTMLSelectElement).value || null })}
    aria-label="Filter by type"
  >
    <option value="">All types</option>
    <option value="payment">Payment</option>
    <option value="refund">Refund</option>
    <option value="payout">Payout</option>
    <option value="transfer">Transfer</option>
    <option value="fee">Fee</option>
    <option value="adjustment">Adjustment</option>
  </select>

  <select
    class="input-base text-sm"
    value={data.filters.currency ?? ''}
    onchange={(e) => updateUrl({ currency: (e.currentTarget as HTMLSelectElement).value || null })}
    aria-label="Filter by currency"
  >
    <option value="">All currencies</option>
    <option value="USD">USD</option>
    <option value="EUR">EUR</option>
    <option value="GBP">GBP</option>
    <option value="CAD">CAD</option>
    <option value="AUD">AUD</option>
  </select>

  {#if Object.values(data.filters).some(Boolean)}
    <button type="button" class="btn-ghost text-xs" onclick={resetFilters}>
      <RotateCcw class="h-3.5 w-3.5" /> Reset
    </button>
  {/if}
</div>

{#snippet tableSection()}
  {@const columns: ColumnDef<TxnRow>[] = [
    { id: 'reference',  header: 'Reference', accessor: 'reference',    sortable: true, width: '180px', cell: refCell },
    { id: 'customer',   header: 'Customer',  accessor: 'customer_id',  cell: customerCell },
    { id: 'type',       header: 'Type',      accessor: 'type',         cell: typeCell, width: '110px' },
    { id: 'status',     header: 'Status',    accessor: 'status',       sortable: true, width: '120px', cell: statusCell },
    { id: 'amount',     header: 'Amount',    accessor: 'amount',       sortable: true, align: 'right', width: '160px', cell: amountCell },
    { id: 'channel',    header: 'Channel',   accessor: 'channel',      cell: channelCell, width: '90px' },
    { id: 'country',    header: 'Country',   accessor: 'country_code', cell: countryCell, align: 'center', width: '70px' },
    { id: 'created_at', header: 'Date',      accessor: 'created_at',   sortable: true, align: 'right', width: '170px', cell: dateCell }
  ]}
  <DataTable
    data={rows}
    {columns}
    total={data.total}
    page={data.page}
    pageSize={data.pageSize}
    sort={data.sort}
    selectable={canApprove}
    selected={selectedRows}
    onSelectChange={(s) => (selectedRows = s)}
    onSort={handleSort}
    onPageChange={handlePage}
    onRowClick={openDetail}
    emptyTitle="No transactions match"
    emptyDescription="Adjust the filters above or clear them to see all transactions."
  >
    {#snippet actions()}
      {#if selectedRows.size > 0}
        <span class="text-sm text-muted">{selectedRows.size} selected</span>
        <Button size="sm" variant="secondary">Flag</Button>
        <Button size="sm" variant="ghost" onclick={() => (selectedRows = new Set())}>
          <X class="h-3.5 w-3.5" /> Clear
        </Button>
      {/if}
    {/snippet}
  </DataTable>
{/snippet}

{@render tableSection()}

{#if data.selected}
  <TransactionDetail selected={data.selected} onClose={closeDetail} />
{/if}
