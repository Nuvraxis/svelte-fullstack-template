<script lang="ts">
  import { page } from '$app/state';
  import { Check, FileText, Download } from '@lucide/svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { formatCurrency, formatDate } from '$lib/utils/formatters';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const currentPlan = $derived(page.data.org?.org.plan ?? 'starter');
  const planOrder = ['starter', 'growth', 'enterprise'] as const;
</script>

<svelte:head><title>Billing · VaultFlow</title></svelte:head>

<header class="mb-6">
  <h1 class="text-2xl font-semibold tracking-tight">Billing</h1>
  <p class="mt-1 text-sm text-muted">Plan, usage, and invoice history.</p>
</header>

<!-- Plan summary -->
<div class="mb-6 grid gap-4 md:grid-cols-3">
  {#each planOrder as planKey (planKey)}
    {@const p = data.plans[planKey]}
    {@const isCurrent = currentPlan === planKey}
    <Card class={`relative p-5 ${isCurrent ? 'border-[var(--primary)]/60 ring-1 ring-[var(--primary)]/40' : ''}`}>
      {#if isCurrent}
        <Badge tone="brand" class="absolute right-3 top-3">Current plan</Badge>
      {/if}
      <h3 class="text-base font-semibold">{p.name}</h3>
      <div class="mt-1 font-mono text-2xl font-semibold tabular-nums">
        {formatCurrency(p.price, 'USD')}<span class="text-xs text-muted"> /mo</span>
      </div>
      <ul class="mt-4 space-y-1.5 text-xs">
        {#each p.features as f (f)}
          <li class="flex items-center gap-2 text-muted">
            <Check class="h-3.5 w-3.5 shrink-0 text-success" /> {f}
          </li>
        {/each}
      </ul>
      <div class="mt-4">
        {#if isCurrent}
          <Button variant="ghost" size="sm" disabled>You're on this plan</Button>
        {:else}
          <Button variant="secondary" size="sm">
            {planOrder.indexOf(planKey) > planOrder.indexOf(currentPlan as typeof planOrder[number]) ? 'Upgrade' : 'Downgrade'}
          </Button>
        {/if}
      </div>
    </Card>
  {/each}
</div>

<!-- Usage stats -->
<div class="mb-6 grid gap-3 md:grid-cols-2">
  <Card class="p-5">
    <div class="text-sm font-medium text-muted">Invoices paid (12m)</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">{data.paidCount.toLocaleString()}</div>
  </Card>
  <Card class="p-5">
    <div class="text-sm font-medium text-muted">Outstanding invoices</div>
    <div class="mt-1.5 font-mono text-2xl font-semibold tabular-nums">{data.dueCount.toLocaleString()}</div>
    {#if data.dueCount > 0}
      <p class="mt-1 text-xs text-warning">Action needed — open or uncollectible invoices on file.</p>
    {/if}
  </Card>
</div>

<!-- Invoice history -->
<Card>
  <div class="border-b border-default px-5 py-3">
    <h2 class="text-base font-semibold">Recent invoices</h2>
    <p class="text-xs text-muted">Last 12 months · most recent first</p>
  </div>
  {#if data.invoices.length === 0}
    <div class="px-6 py-12 text-center text-sm text-muted">No invoices in the last 12 months.</div>
  {:else}
    <ul class="divide-y divide-[var(--color-border-subtle)]">
      {#each data.invoices as inv (inv.id)}
        <li class="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div class="flex min-w-0 items-center gap-3">
            <div class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-3">
              <FileText class="h-4 w-4 text-muted" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="truncate font-mono text-sm">{inv.number}</span>
                <StatusBadge status={inv.status} kind="invoice" />
              </div>
              <div class="mt-0.5 text-xs text-subtle">
                {inv.due_date ? `Due ${formatDate(inv.due_date)}` : `Issued ${formatDate(inv.created_at)}`}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <div class="font-mono text-sm font-medium tabular-nums">
                {formatCurrency(Number(inv.amount_due), inv.currency)}
              </div>
              {#if inv.status === 'paid' && inv.paid_at}
                <div class="text-xs text-subtle">paid {formatDate(inv.paid_at)}</div>
              {/if}
            </div>
            <Button size="sm" variant="ghost" aria-label="Download invoice">
              <Download class="h-3.5 w-3.5" />
            </Button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</Card>
