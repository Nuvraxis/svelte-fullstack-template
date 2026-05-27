<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import DataTable from '$lib/components/data-table/DataTable.svelte';
  import type { ColumnDef } from '$lib/components/data-table/types';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import { formatCurrency, formatRelativeDate } from '$lib/utils/formatters';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  interface CustomerRow {
    id: string;
    full_name: string;
    email: string;
    company: string | null;
    country_code: string | null;
    status: string;
    ltv: number;
    mrr: number;
    risk_score: number | null;
    created_at: string;
  }

  const rows = $derived(data.customers as CustomerRow[]);

  function updateUrl(u: Record<string, string | null>) {
    const params = new URLSearchParams(page.url.searchParams);
    for (const [k, v] of Object.entries(u)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in u)) params.delete('page');
    goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
  }

  function riskTone(score: number | null): 'success' | 'warning' | 'danger' | 'neutral' {
    if (score === null) return 'neutral';
    if (score < 30) return 'success';
    if (score < 60) return 'warning';
    return 'danger';
  }
</script>

{#snippet nameCell({ row }: { value: unknown; row: CustomerRow })}
  <div class="min-w-0">
    <a href={`/customers/${row.id}`} class="block truncate font-medium hover:text-brand-300">{row.full_name}</a>
    <div class="truncate text-xs text-muted">{row.email}</div>
  </div>
{/snippet}

{#snippet companyCell({ value }: { value: unknown; row: CustomerRow })}
  <span class="truncate text-muted">{value ?? '—'}</span>
{/snippet}

{#snippet countryCell({ value }: { value: unknown; row: CustomerRow })}
  <span class="font-mono text-xs uppercase">{value ?? '—'}</span>
{/snippet}

{#snippet statusCell({ value }: { value: unknown; row: CustomerRow })}
  <StatusBadge status={String(value)} kind="customer" />
{/snippet}

{#snippet ltvCell({ value }: { value: unknown; row: CustomerRow })}
  <span class="font-mono tabular-nums">{formatCurrency(Number(value), 'USD', { compact: true })}</span>
{/snippet}

{#snippet mrrCell({ value }: { value: unknown; row: CustomerRow })}
  {#if Number(value) > 0}
    <span class="font-mono tabular-nums">{formatCurrency(Number(value), 'USD')}</span>
  {:else}
    <span class="text-subtle">—</span>
  {/if}
{/snippet}

{#snippet riskCell({ row }: { value: unknown; row: CustomerRow })}
  {#if row.risk_score === null}
    <span class="text-subtle">—</span>
  {:else}
    {@const tone = riskTone(row.risk_score)}
    <div class="flex items-center justify-end gap-2">
      <span class="font-mono text-xs tabular-nums">{row.risk_score.toFixed(0)}</span>
      <span class="h-1.5 w-12 overflow-hidden rounded-full bg-surface-3">
        <span
          class="block h-full"
          style="width:{row.risk_score}%; background:{
            tone === 'danger' ? 'var(--color-danger)' :
            tone === 'warning' ? 'var(--color-warning)' :
            'var(--color-success)'
          }"
        ></span>
      </span>
    </div>
  {/if}
{/snippet}

{#snippet sinceCell({ value }: { value: unknown; row: CustomerRow })}
  <span class="text-muted">{formatRelativeDate(String(value))}</span>
{/snippet}

<svelte:head><title>Customers · VaultFlow</title></svelte:head>

<header class="mb-6">
  <h1 class="text-2xl font-semibold tracking-tight">Customers</h1>
  <p class="mt-1 text-sm text-muted">
    {data.total.toLocaleString()} total · showing {rows.length} on this page
  </p>
</header>

<div class="mb-4 flex flex-wrap items-center gap-2">
  <Input
    type="search"
    placeholder="Search name, email, company…"
    class="w-full sm:w-72"
    value={data.filters.search ?? ''}
    onchange={(e) => updateUrl({ q: (e.currentTarget as HTMLInputElement).value })}
    aria-label="Search customers"
  />
  <select
    class="input-base text-sm"
    value={data.filters.status ?? ''}
    onchange={(e) => updateUrl({ status: (e.currentTarget as HTMLSelectElement).value || null })}
    aria-label="Filter by status"
  >
    <option value="">All statuses</option>
    <option value="active">Active</option>
    <option value="trial">Trial</option>
    <option value="paused">Paused</option>
    <option value="churned">Churned</option>
    <option value="blocked">Blocked</option>
  </select>
</div>

{#snippet tableSection()}
  {@const columns: ColumnDef<CustomerRow>[] = [
    { id: 'name',       header: 'Name',     accessor: 'full_name',    cell: nameCell },
    { id: 'company',    header: 'Company',  accessor: 'company',      cell: companyCell },
    { id: 'country',    header: 'Country',  accessor: 'country_code', cell: countryCell, align: 'center', width: '70px' },
    { id: 'status',     header: 'Status',   accessor: 'status',       cell: statusCell, width: '120px' },
    { id: 'ltv',        header: 'LTV',      accessor: 'ltv',          cell: ltvCell, align: 'right', width: '100px' },
    { id: 'mrr',        header: 'MRR',      accessor: 'mrr',          cell: mrrCell, align: 'right', width: '120px' },
    { id: 'risk',       header: 'Risk',     accessor: 'risk_score',   cell: riskCell, align: 'right', width: '140px' },
    { id: 'created_at', header: 'Customer since', accessor: 'created_at', cell: sinceCell, align: 'right', width: '140px' }
  ]}
  <DataTable
    data={rows}
    {columns}
    total={data.total}
    page={data.page}
    pageSize={data.pageSize}
    rowHref={(r) => `/customers/${r.id}`}
    onRowClick={(r) => goto(`/customers/${r.id}`)}
    onPageChange={(p) => updateUrl({ page: String(p) })}
    emptyTitle="No customers match"
    emptyDescription="Try clearing your filters."
  />
{/snippet}

{@render tableSection()}
