<script lang="ts">
  import { enhance } from '$app/forms';
  import { Calendar, Download, ArrowLeft, Mail, Trash2 } from '@lucide/svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Label from '$lib/components/ui/Label.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let submitting = $state(false);

  const FREQUENCIES = [
    { value: 'daily',   label: 'Daily',   help: 'Sent every morning at 09:00 in your org timezone.' },
    { value: 'weekly',  label: 'Weekly',  help: 'Sent every Monday morning.' },
    { value: 'monthly', label: 'Monthly', help: 'Sent on the 1st of each month.' }
  ] as const;

  const recipientsText = $derived(data.schedule.recipients.join(', '));
</script>

<svelte:head><title>{data.meta.name} · VaultFlow</title></svelte:head>

<div class="mb-4">
  <Button variant="ghost" size="sm" href="/reports">
    <ArrowLeft class="h-4 w-4" /> All reports
  </Button>
</div>

<header class="mb-6 flex flex-wrap items-start justify-between gap-3">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">{data.meta.name}</h1>
    <p class="mt-1 max-w-2xl text-sm text-muted">{data.meta.description}</p>
    <p class="mt-2 text-xs text-subtle">{data.meta.scopeLabel}</p>
  </div>
  {#if data.canExport}
    <Button href={`/api/export/${data.slug}.csv`}>
      <Download class="h-4 w-4" /> Export CSV
    </Button>
  {/if}
</header>

<div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
  <!-- Preview -->
  <Card>
    <div class="border-b border-default px-5 py-3">
      <h2 class="text-base font-semibold">Preview</h2>
      <p class="text-xs text-muted">First 10 rows — export the full CSV for the complete dataset.</p>
    </div>
    {#if data.preview.rows.length === 0}
      <div class="px-6 py-12 text-center text-sm text-muted">No data in this report yet.</div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <caption class="sr-only">{data.meta.name} preview</caption>
          <thead class="border-b border-default text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              {#each data.preview.columns as col (col)}
                <th scope="col" class="px-4 py-2 font-medium">{col}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each data.preview.rows as row, i (i)}
              <tr class="border-b border-default last:border-b-0">
                {#each row as cell, j (j)}
                  <td class="px-4 py-2 {j === 0 ? '' : 'font-mono tabular-nums text-muted'}">{cell}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>

  <!-- Schedule -->
  <Card class="p-5">
    <div class="mb-4 flex items-center gap-2">
      <Calendar class="h-4 w-4 text-muted" />
      <h2 class="text-base font-semibold">Schedule</h2>
      {#if data.schedule.enabled}
        <Badge tone="success">Active</Badge>
      {:else}
        <Badge tone="neutral">Paused</Badge>
      {/if}
    </div>

    {#if !data.canSchedule}
      <p class="rounded-md border border-default bg-surface-2 px-3 py-2 text-xs text-muted">
        You need <code class="font-mono">reports:create</code> permission to schedule reports.
      </p>
    {:else}
      <form
        method="POST"
        action="?/saveSchedule"
        use:enhance={() => {
          submitting = true;
          return async ({ update }) => {
            await update();
            submitting = false;
          };
        }}
        class="space-y-4"
      >
        <fieldset>
          <legend class="mb-1.5 block text-xs font-medium text-muted">Frequency</legend>
          <div class="space-y-1.5">
            {#each FREQUENCIES as f (f.value)}
              <label class="flex cursor-pointer items-start gap-2.5 rounded-md border border-default bg-surface-2 px-3 py-2 transition-colors hover:bg-surface-3 has-[:checked]:border-[var(--primary)]/50 has-[:checked]:bg-[var(--primary)]/10">
                <input
                  type="radio"
                  name="frequency"
                  value={f.value}
                  checked={data.schedule.frequency === f.value}
                  class="mt-0.5 h-3.5 w-3.5 accent-[var(--primary)]"
                />
                <div class="min-w-0">
                  <div class="text-sm font-medium">{f.label}</div>
                  <div class="text-xs text-subtle">{f.help}</div>
                </div>
              </label>
            {/each}
          </div>
        </fieldset>

        <div>
          <Label for="recipients">
            <Mail class="mr-1 inline h-3 w-3" /> Recipients
          </Label>
          <Input
            id="recipients"
            name="recipients"
            type="text"
            placeholder="alice@novapay.io, bob@novapay.io"
            value={recipientsText}
          />
          <p class="mt-1 text-xs text-subtle">Comma- or space-separated email addresses.</p>
        </div>

        <label class="flex cursor-pointer items-center gap-2.5 rounded-md border border-default bg-surface-2 px-3 py-2">
          <input
            type="checkbox"
            name="enabled"
            checked={data.schedule.enabled}
            class="h-4 w-4 accent-[var(--primary)]"
          />
          <span class="text-sm">Schedule enabled</span>
        </label>

        {#if data.schedule.next_run && data.schedule.enabled}
          <p class="text-xs text-subtle">
            Next run: {new Date(data.schedule.next_run).toLocaleString()}
          </p>
        {/if}

        {#if form?.error}
          <p class="text-sm text-danger" role="alert">{form.error}</p>
        {/if}
        {#if form?.success}
          <p class="text-sm text-success" role="status">Schedule saved.</p>
        {/if}
        {#if form?.removed}
          <p class="text-sm text-muted" role="status">Schedule removed.</p>
        {/if}

        <div class="flex flex-wrap gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save schedule'}
          </Button>
          {#if data.schedule.enabled}
            <Button
              type="submit"
              variant="ghost"
              formaction="?/removeSchedule"
            >
              <Trash2 class="h-3.5 w-3.5" /> Remove
            </Button>
          {/if}
        </div>
      </form>
    {/if}
  </Card>
</div>
