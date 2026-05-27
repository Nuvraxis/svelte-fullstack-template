<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import { cn } from '$lib/utils/cn';

  interface Props {
    children: Snippet;
  }
  let { children }: Props = $props();

  const TABS = [
    { href: '/settings/profile', label: 'Profile' },
    { href: '/settings/organization', label: 'Organization', perm: { resource: 'settings' as const, action: 'read' as const } },
    { href: '/settings/appearance', label: 'Appearance' },
    { href: '/settings/notifications', label: 'Notifications' },
    { href: '/settings/api-keys', label: 'API keys', perm: { resource: 'billing' as const, action: 'read' as const } },
    { href: '/settings/billing', label: 'Billing', perm: { resource: 'billing' as const, action: 'read' as const } }
  ];

  const visible = $derived(
    TABS.filter(
      (t) => !t.perm || page.data.permissions?.[`${t.perm.resource}:${t.perm.action}`] === true
    )
  );
</script>

<header class="mb-6">
  <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
  <p class="mt-1 text-sm text-muted">Organization, profile, and integrations.</p>
</header>

<div class="flex flex-col gap-6 lg:flex-row">
  <nav aria-label="Settings sections" class="flex flex-row gap-1 overflow-x-auto lg:w-48 lg:flex-col">
    {#each visible as tab (tab.href)}
      <a
        href={tab.href}
        class={cn(
          'whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors',
          page.url.pathname === tab.href || (tab.href !== '/settings' && page.url.pathname.startsWith(tab.href))
            ? 'bg-brand-600/15 text-brand-300'
            : 'text-muted hover:bg-surface-2 hover:text-foreground'
        )}
        aria-current={page.url.pathname === tab.href ? 'page' : undefined}
      >
        {tab.label}
      </a>
    {/each}
  </nav>

  <div class="flex-1">
    {@render children()}
  </div>
</div>
