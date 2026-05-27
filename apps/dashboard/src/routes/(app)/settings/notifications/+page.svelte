<script lang="ts">
  import { enhance } from '$app/forms';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { ShieldAlert, CreditCard, TrendingDown, UserPlus, FileBarChart2, Mail } from '@lucide/svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  interface Row {
    key: keyof typeof data.prefs;
    icon: typeof ShieldAlert;
    title: string;
    description: string;
  }

  const ROWS: Row[] = [
    { key: 'fraud_alert',    icon: ShieldAlert,    title: 'Fraud alerts',           description: 'High-severity fraud signals on transactions.' },
    { key: 'payment_failed', icon: CreditCard,     title: 'Payment failures',       description: 'Failed subscription renewals and overdue invoices.' },
    { key: 'churn_risk',     icon: TrendingDown,   title: 'Churn risk',             description: 'Customers showing high churn risk or canceling trials.' },
    { key: 'invite',         icon: UserPlus,       title: 'Team activity',          description: 'Invites accepted, role changes, member status.' },
    { key: 'report',         icon: FileBarChart2,  title: 'Report ready',           description: 'Your scheduled reports finish generating.' },
    { key: 'email_digest',   icon: Mail,           title: 'Weekly email digest',    description: 'Receive a summary of the week’s activity over email.' }
  ];

  let submitting = $state(false);
</script>

<svelte:head><title>Notification preferences · VaultFlow</title></svelte:head>

<Card class="p-6">
  <h2 class="mb-1 text-lg font-semibold">Notification preferences</h2>
  <p class="mb-5 text-sm text-muted">
    Choose which events trigger an in-app notification (and, for some, an email digest).
  </p>

  <form
    method="POST"
    action="?/update"
    use:enhance={() => {
      submitting = true;
      return async ({ update }) => {
        await update();
        submitting = false;
      };
    }}
    class="space-y-2"
  >
    {#each ROWS as row (row.key)}
      {@const Icon = row.icon}
      <label
        class="flex cursor-pointer items-start gap-3 rounded-md border border-default bg-surface-2 px-4 py-3 transition-colors hover:bg-surface-3"
      >
        <div class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[var(--primary)]/15 text-[var(--primary)]">
          <Icon class="h-4 w-4" aria-hidden="true" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium">{row.title}</div>
          <div class="text-xs text-muted">{row.description}</div>
        </div>
        <input
          type="checkbox"
          name={row.key}
          checked={data.prefs[row.key]}
          class="mt-1 h-4 w-4 accent-[var(--primary)]"
          data-testid={`pref-${row.key}`}
        />
      </label>
    {/each}

    {#if form?.error}
      <p class="text-sm text-danger" role="alert">{form.error}</p>
    {/if}
    {#if form?.success}
      <p class="text-sm text-success" role="status">Preferences saved.</p>
    {/if}

    <div class="flex justify-end pt-2">
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save preferences'}
      </Button>
    </div>
  </form>
</Card>
