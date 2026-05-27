<script lang="ts">
  import { page } from '$app/state';
  import { FileBarChart2, ShieldAlert, TrendingDown, Globe, Calendar, Download } from '@lucide/svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const canExport = $derived(page.data.permissions?.['reports:export'] === true);

  interface Report {
    slug: string;
    name: string;
    description: string;
    Icon: typeof FileBarChart2;
    badge?: string;
    /** Sample size or scope label */
    scope: string;
  }

  const REPORTS = $derived<Report[]>([
    {
      slug: 'monthly-summary',
      name: 'Monthly summary',
      description: 'Revenue, transactions, and customer growth metrics for the past 30 days.',
      Icon: FileBarChart2,
      badge: 'popular',
      scope: 'Last 30 days'
    },
    {
      slug: 'fraud-report',
      name: 'Fraud report',
      description: 'All unresolved fraud signals with severity, score, and linked transaction.',
      Icon: ShieldAlert,
      scope: `${data.counts.fraud.toLocaleString()} signals`
    },
    {
      slug: 'churn-analysis',
      name: 'Churn analysis',
      description: 'Churned customers grouped by reason, with MRR lost per reason.',
      Icon: TrendingDown,
      scope: `${data.counts.churn.toLocaleString()} events`
    },
    {
      slug: 'revenue-by-country',
      name: 'Revenue by country',
      description: 'Transaction volume and fees collected broken down by ISO country code.',
      Icon: Globe,
      scope: `${data.counts.transactions.toLocaleString()} transactions`
    }
  ]);
</script>

<svelte:head><title>Reports · VaultFlow</title></svelte:head>

<header class="mb-6">
  <h1 class="text-2xl font-semibold tracking-tight">Reports</h1>
  <p class="mt-1 text-sm text-muted">
    Pre-built reports and exports. Click any tile to export — schedule and custom-builder coming soon.
  </p>
</header>

<div class="grid gap-4 md:grid-cols-2">
  {#each REPORTS as report (report.slug)}
    {@const Icon = report.Icon}
    <Card class="flex flex-col gap-3 p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-600/15">
          <Icon class="h-5 w-5 text-brand-300" aria-hidden="true" />
        </div>
        {#if report.badge}<Badge tone="brand">{report.badge}</Badge>{/if}
      </div>
      <div>
        <h3 class="text-base font-semibold">{report.name}</h3>
        <p class="mt-1 text-sm text-muted">{report.description}</p>
      </div>
      <div class="mt-auto flex items-center justify-between gap-3 pt-2">
        <span class="text-xs text-subtle">{report.scope}</span>
        <div class="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" href={`/reports/${report.slug}`}>
            <Calendar class="h-3.5 w-3.5" /> Schedule
          </Button>
          {#if canExport}
            <Button size="sm" variant="secondary" href={`/api/export/${report.slug}.csv`}>
              <Download class="h-3.5 w-3.5" /> Export CSV
            </Button>
          {/if}
        </div>
      </div>
    </Card>
  {/each}
</div>

<div class="mt-8 rounded-lg border border-dashed border-default p-6 text-center">
  <h3 class="text-base font-medium">Custom report builder</h3>
  <p class="mt-1 text-sm text-muted">Drag-and-drop metric picker — coming soon.</p>
</div>
