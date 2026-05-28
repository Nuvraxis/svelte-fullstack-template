<script lang="ts" generics="T extends { id: string }">
  import type { Snippet } from 'svelte';
  import { ArrowUp, ArrowDown, Inbox } from '@lucide/svelte';
  import { cn } from '$lib/utils/cn';
  import type { ColumnDef, SortState } from './types';

  interface Props {
    data: T[];
    columns: ColumnDef<T>[];
    total: number;
    page: number;
    pageSize: number;
    loading?: boolean;
    sort?: SortState | null;
    selectable?: boolean;
    selected?: Set<string>;
    rowHref?: (row: T) => string;
    onRowClick?: (row: T) => void;
    onSort?: (column: string) => void;
    onPageChange?: (page: number) => void;
    onSelectChange?: (selected: Set<string>) => void;
    emptyTitle?: string;
    emptyDescription?: string;
    actions?: Snippet;
    /** Override the default <tr> with this snippet (advanced) */
  }

  let {
    data,
    columns,
    total,
    page,
    pageSize,
    loading = false,
    sort = null,
    selectable = false,
    selected = new Set(),
    rowHref,
    onRowClick,
    onSort,
    onPageChange,
    onSelectChange,
    emptyTitle = 'No results',
    emptyDescription = 'Try adjusting your filters.',
    actions
  }: Props = $props();

  const visibleColumns = $derived(columns.filter((c) => !c.hidden));

  function getValue(row: T, col: ColumnDef<T>): unknown {
    return typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
  }

  function alignClass(a: ColumnDef<T>['align']): string {
    return a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';
  }

  function toggleSelect(id: string): void {
    if (!onSelectChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectChange(next);
  }

  function toggleSelectAll(): void {
    if (!onSelectChange) return;
    if (selected.size === data.length) onSelectChange(new Set());
    else onSelectChange(new Set(data.map((r) => r.id)));
  }

  const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));
  const startIndex = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
  const endIndex   = $derived(Math.min(total, page * pageSize));

  function handleRowClick(e: MouseEvent | KeyboardEvent, row: T): void {
    // Don't hijack clicks on checkboxes or other inputs inside the row
    const target = e.target as HTMLElement;
    if (target.closest('input, button, a')) return;
    onRowClick?.(row);
  }
</script>

<div class="card overflow-hidden">
  {#if actions}
    <div class="flex items-center gap-2 border-b border-default px-4 py-3">
      {@render actions()}
    </div>
  {/if}

  <div class="relative overflow-x-auto">
    <table
      class="w-full border-collapse text-sm"
      role="grid"
      aria-rowcount={total}
      aria-colcount={visibleColumns.length + (selectable ? 1 : 0)}
      aria-busy={loading}
    >
      <thead class="sticky top-0 z-10 bg-surface-1">
        <tr class="border-b border-default">
          {#if selectable}
            <th scope="col" class="w-10 px-3 py-2.5 text-left">
              <input
                type="checkbox"
                aria-label="Select all rows on this page"
                checked={data.length > 0 && selected.size === data.length}
                indeterminate={selected.size > 0 && selected.size < data.length}
                onchange={toggleSelectAll}
                class="h-4 w-4 accent-brand-500"
              />
            </th>
          {/if}
          {#each visibleColumns as col (col.id)}
            {@const ariaSort =
              sort?.column === col.id
                ? (sort.direction === 'asc' ? 'ascending' : 'descending')
                : col.sortable ? 'none' : undefined}
            <th
              scope="col"
              style={col.width ? `width:${col.width}` : undefined}
              class={cn(
                'whitespace-nowrap px-3 py-2.5 font-medium text-muted',
                alignClass(col.align),
                col.sticky === 'left' && 'sticky left-0 z-[5] bg-surface-1',
                col.sticky === 'right' && 'sticky right-0 z-[5] bg-surface-1'
              )}
              aria-sort={ariaSort}
            >
              {#if col.sortable && onSort}
                <button
                  type="button"
                  class="-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-brand-400"
                  onclick={() => onSort(col.id)}
                >
                  <span>{col.header}</span>
                  {#if sort?.column === col.id}
                    {#if sort.direction === 'asc'}
                      <ArrowUp class="h-3 w-3" aria-hidden="true" />
                    {:else}
                      <ArrowDown class="h-3 w-3" aria-hidden="true" />
                    {/if}
                  {/if}
                </button>
              {:else}
                {col.header}
              {/if}
            </th>
          {/each}
        </tr>
      </thead>

      <tbody>
        {#if loading}
          {#each Array.from({ length: Math.min(pageSize, 8) }) as _, i (i)}
            <tr class="animate-pulse border-b border-subtle">
              {#if selectable}<td class="px-3 py-3"><div class="h-4 w-4 rounded bg-surface-3"></div></td>{/if}
              {#each visibleColumns as col (col.id)}
                <td class="px-3 py-3">
                  <div class="h-4 rounded bg-surface-3" style="width: {40 + ((i * 7 + col.id.length * 5) % 50)}%"></div>
                </td>
              {/each}
            </tr>
          {/each}
        {:else if data.length === 0}
          <tr>
            <td colspan={visibleColumns.length + (selectable ? 1 : 0)}>
              <div class="flex flex-col items-center gap-2 py-16 text-center">
                <Inbox class="h-10 w-10 text-subtle" aria-hidden="true" />
                <h3 class="text-base font-medium">{emptyTitle}</h3>
                <p class="max-w-md text-sm text-muted">{emptyDescription}</p>
              </div>
            </td>
          </tr>
        {:else}
          {#each data as row, i (row.id)}
            {@const isSelected = selected.has(row.id)}
            <tr
              class={cn(
                'border-b border-subtle transition-colors',
                (onRowClick || rowHref) && 'cursor-pointer hover:bg-surface-2',
                isSelected && 'bg-brand-600/5'
              )}
              aria-rowindex={i + 1 + (page - 1) * pageSize}
              aria-selected={selectable ? isSelected : undefined}
              tabindex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'row' : undefined}
              onclick={(e) => handleRowClick(e, row)}
              onkeydown={(e) => {
                if (e.key === 'Enter') handleRowClick(e, row);
              }}
            >
              {#if selectable}
                <td class="px-3 py-2.5" onclick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label="Select row"
                    checked={isSelected}
                    onchange={() => toggleSelect(row.id)}
                    class="h-4 w-4 accent-brand-500"
                  />
                </td>
              {/if}
              {#each visibleColumns as col (col.id)}
                {@const value = getValue(row, col)}
                <td
                  class={cn(
                    'whitespace-nowrap px-3 py-2.5',
                    alignClass(col.align),
                    col.sticky === 'left' && 'sticky left-0 z-[1] bg-inherit',
                    col.sticky === 'right' && 'sticky right-0 z-[1] bg-inherit'
                  )}
                >
                  {#if col.cell}
                    {@render col.cell({ value, row })}
                  {:else}
                    {value ?? ''}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Pagination footer -->
  {#if !loading && total > 0}
    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default px-4 py-3 text-sm text-muted">
      <span class="tabular-nums">
        {startIndex}–{endIndex} of {total.toLocaleString()}
      </span>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="btn-ghost px-2 py-1 disabled:opacity-40"
          disabled={page <= 1}
          onclick={() => onPageChange?.(page - 1)}
          aria-label="Previous page"
        >Prev</button>
        <span class="px-2 tabular-nums">
          Page <span class="font-medium text-foreground">{page}</span> of {totalPages}
        </span>
        <button
          type="button"
          class="btn-ghost px-2 py-1 disabled:opacity-40"
          disabled={page >= totalPages}
          onclick={() => onPageChange?.(page + 1)}
          aria-label="Next page"
        >Next</button>
      </div>
    </div>
  {/if}
</div>
