<script lang="ts">
  import { ShieldAlert } from '@lucide/svelte';
  import SlideOver from '$lib/components/SlideOver.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { formatCurrency, formatDate, shortId } from '$lib/utils/formatters';
  import { page } from '$app/state';

  interface FraudSignal {
    id: string;
    signal_type: string;
    severity: string;
    score: number | null;
    resolved: boolean;
    created_at: string;
  }
  interface Customer {
    id: string;
    full_name: string;
    email: string;
    company: string | null;
  }
  interface Selected {
    transaction: Record<string, unknown>;
    customer: Customer | null;
    fraud_signals: FraudSignal[];
  }

  interface Props {
    selected: Selected;
    onClose: () => void;
  }
  let { selected, onClose }: Props = $props();

  const tx = $derived(selected.transaction);
  const canApprove = $derived(page.data.permissions?.['transactions:approve'] === true);

  function field<T = unknown>(key: string): T {
    return tx[key] as T;
  }
</script>

<SlideOver
  open={true}
  title={field<string>('reference')}
  description="Transaction details"
  width="lg"
  {onClose}
>
  <div class="space-y-6">
    <!-- KPIs row -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-lg border border-default bg-surface-2 p-3">
        <div class="text-xs text-muted">Amount</div>
        <div class="mt-1 font-mono text-lg font-semibold tabular-nums">
          {formatCurrency(field<number>('amount') ?? 0, field<string>('currency') ?? 'USD')}
        </div>
      </div>
      <div class="rounded-lg border border-default bg-surface-2 p-3">
        <div class="text-xs text-muted">Fee</div>
        <div class="mt-1 font-mono text-lg tabular-nums">
          {formatCurrency(field<number>('fee_amount') ?? 0, field<string>('currency') ?? 'USD')}
        </div>
      </div>
      <div class="rounded-lg border border-default bg-surface-2 p-3">
        <div class="text-xs text-muted">Net</div>
        <div class="mt-1 font-mono text-lg tabular-nums">
          {formatCurrency(field<number>('net_amount') ?? 0, field<string>('currency') ?? 'USD')}
        </div>
      </div>
      <div class="rounded-lg border border-default bg-surface-2 p-3">
        <div class="text-xs text-muted">Status</div>
        <div class="mt-1.5">
          <StatusBadge status={field<string>('status')} kind="transaction" />
        </div>
      </div>
    </div>

    <!-- Details list -->
    <div>
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">Details</h3>
      <dl class="space-y-2 rounded-lg border border-default bg-surface-2 p-4 text-sm">
        <div class="flex justify-between gap-3"><dt class="text-muted">ID</dt><dd class="font-mono text-xs">{shortId(field<string>('id'), 16)}</dd></div>
        <div class="flex justify-between gap-3"><dt class="text-muted">Type</dt><dd class="capitalize">{field<string>('type')}</dd></div>
        <div class="flex justify-between gap-3"><dt class="text-muted">Payment method</dt><dd class="capitalize">{field<string>('payment_method') ?? '—'}</dd></div>
        <div class="flex justify-between gap-3"><dt class="text-muted">Channel</dt><dd class="capitalize">{field<string>('channel') ?? '—'}</dd></div>
        <div class="flex justify-between gap-3"><dt class="text-muted">Country</dt><dd class="font-mono">{field<string>('country_code') ?? '—'}</dd></div>
        <div class="flex justify-between gap-3"><dt class="text-muted">Created</dt><dd>{formatDate(field<string>('created_at'), 'long')}</dd></div>
        {#if field<string>('processed_at')}
          <div class="flex justify-between gap-3"><dt class="text-muted">Processed</dt><dd>{formatDate(field<string>('processed_at'), 'long')}</dd></div>
        {/if}
        {#if field<string>('flagged_reason')}
          <div class="flex justify-between gap-3"><dt class="text-muted">Flag reason</dt><dd class="capitalize">{field<string>('flagged_reason')}</dd></div>
        {/if}
      </dl>
    </div>

    <!-- Customer -->
    {#if selected.customer}
      <div>
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">Customer</h3>
        <a
          href={`/customers/${selected.customer.id}`}
          class="flex items-center justify-between rounded-lg border border-default bg-surface-2 p-4 transition-colors hover:bg-surface-3"
        >
          <div class="min-w-0">
            <div class="truncate font-medium">{selected.customer.full_name}</div>
            <div class="truncate text-xs text-muted">{selected.customer.email}</div>
            {#if selected.customer.company}
              <div class="mt-0.5 truncate text-xs text-subtle">{selected.customer.company}</div>
            {/if}
          </div>
          <span class="text-xs text-brand-400">View →</span>
        </a>
      </div>
    {/if}

    <!-- Fraud signals -->
    {#if selected.fraud_signals.length}
      <div>
        <h3 class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle">
          <ShieldAlert class="h-3.5 w-3.5 text-warning" aria-hidden="true" />
          Fraud signals
        </h3>
        <ul class="space-y-2">
          {#each selected.fraud_signals as s (s.id)}
            <li class="flex items-center justify-between gap-2 rounded-lg border border-default bg-surface-2 p-3 text-sm">
              <div>
                <div class="font-medium capitalize">{s.signal_type.replace(/_/g, ' ')}</div>
                <div class="text-xs text-muted">{formatDate(s.created_at, 'time')}</div>
              </div>
              <div class="flex items-center gap-2">
                {#if s.score !== null}
                  <span class="font-mono text-xs tabular-nums text-muted">{s.score.toFixed(0)}</span>
                {/if}
                <StatusBadge status={s.severity} kind="fraud" />
                {#if s.resolved}
                  <Badge tone="success">resolved</Badge>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>

  {#snippet footer()}
    <div class="flex items-center justify-between gap-2">
      <Button variant="ghost" onclick={onClose}>Close</Button>
      {#if canApprove && field<string>('status') !== 'flagged'}
        <Button variant="secondary">Flag for review</Button>
      {/if}
    </div>
  {/snippet}
</SlideOver>
