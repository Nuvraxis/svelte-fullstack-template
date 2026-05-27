<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import DataTable from '$lib/components/data-table/DataTable.svelte';
  import type { ColumnDef } from '$lib/components/data-table/types';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import { formatDate } from '$lib/utils/formatters';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  interface AuditRow {
    id: string;
    actor_email: string | null;
    action: string;
    resource: string;
    resource_id: string | null;
    ip_address: string | null;
    created_at: string;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
  }

  const rows = $derived(data.entries as AuditRow[]);

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

{#snippet whenCell({ value }: { value: unknown; row: AuditRow })}
  <span class="tabular-nums text-muted">{formatDate(String(value), 'time')}</span>
{/snippet}

{#snippet actorCell({ row }: { value: unknown; row: AuditRow })}
  {#if row.actor_email}
    <span class="text-foreground">{row.actor_email}</span>
  {:else}
    <span class="text-subtle">system</span>
  {/if}
{/snippet}

{#snippet actionCell({ row }: { value: unknown; row: AuditRow })}
  <code class="font-mono text-xs">{row.action}</code>
{/snippet}

{#snippet resourceCell({ row }: { value: unknown; row: AuditRow })}
  <Badge tone="neutral">{row.resource}</Badge>
{/snippet}

{#snippet ipCell({ value }: { value: unknown; row: AuditRow })}
  <span class="font-mono text-xs text-subtle">{value ?? '—'}</span>
{/snippet}

<svelte:head><title>Audit log · VaultFlow</title></svelte:head>

<header class="mb-6">
  <h1 class="text-2xl font-semibold tracking-tight">Audit log</h1>
  <p class="mt-1 text-sm text-muted">
    {data.total.toLocaleString()} events · admin-only
  </p>
</header>

<div class="mb-4 flex flex-wrap items-center gap-2">
  <Input
    type="search"
    placeholder="Filter by actor email…"
    class="w-full sm:w-72"
    value={data.filters.actor ?? ''}
    onchange={(e) => updateUrl({ actor: (e.currentTarget as HTMLInputElement).value })}
    aria-label="Filter by actor"
  />
  <select
    class="input-base text-sm"
    value={data.filters.resource ?? ''}
    onchange={(e) => updateUrl({ resource: (e.currentTarget as HTMLSelectElement).value || null })}
    aria-label="Filter by resource"
  >
    <option value="">All resources</option>
    <option value="transactions">Transactions</option>
    <option value="customers">Customers</option>
    <option value="team">Team</option>
    <option value="subscriptions">Subscriptions</option>
    <option value="fraud">Fraud</option>
    <option value="settings">Settings</option>
  </select>
</div>

{#if rows.length === 0 && !data.filters.actor && !data.filters.resource}
  <Card class="p-8 text-center">
    <h3 class="text-base font-semibold">No audit events yet</h3>
    <p class="mt-2 text-sm text-muted max-w-md mx-auto">
      Events appear here when team members invite users, approve transactions, change roles, or modify settings.
    </p>
  </Card>
{:else}
  {#snippet tableSection()}
    {@const columns: ColumnDef<AuditRow>[] = [
      { id: 'when',     header: 'When',    accessor: 'created_at', cell: whenCell, width: '170px' },
      { id: 'actor',    header: 'Actor',   accessor: 'actor_email', cell: actorCell },
      { id: 'action',   header: 'Action',  accessor: 'action', cell: actionCell, width: '220px' },
      { id: 'resource', header: 'Resource', accessor: 'resource', cell: resourceCell, width: '120px' },
      { id: 'ip',       header: 'IP',      accessor: 'ip_address', cell: ipCell, width: '140px' }
    ]}
    <DataTable
      data={rows}
      {columns}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
      onPageChange={(p) => updateUrl({ page: String(p) })}
      emptyTitle="No events match"
      emptyDescription="Try clearing your filters."
    />
  {/snippet}

  {@render tableSection()}
{/if}
