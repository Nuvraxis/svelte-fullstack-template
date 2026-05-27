<script lang="ts">
  import { page } from '$app/state';
  import { uiStore } from '$lib/stores/ui.store.svelte';
  import { Menu, Search, Command } from '@lucide/svelte';
  import Notifications from './Notifications.svelte';

  // Derive breadcrumb from URL
  const segments = $derived.by(() => {
    const parts = page.url.pathname.split('/').filter(Boolean);
    return parts.map((seg, i) => ({
      href: '/' + parts.slice(0, i + 1).join('/'),
      label: seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));
  });

  const orgName = $derived(page.data.org?.org.name ?? '');
</script>

<header
  class="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-default bg-surface-0/80 px-4 backdrop-blur-md md:px-6"
>
  <div class="flex items-center gap-3 min-w-0">
    <button
      class="btn-ghost p-1.5 md:hidden"
      aria-label="Open menu"
      onclick={() => uiStore.toggleMobileSidebar()}
    >
      <Menu class="h-5 w-5" />
    </button>

    <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-sm min-w-0">
      {#if orgName}
        <span class="hidden text-muted sm:inline">{orgName}</span>
        <span class="hidden text-subtle sm:inline">/</span>
      {/if}
      {#each segments as seg, i (seg.href)}
        {#if i > 0}
          <span class="text-subtle">/</span>
        {/if}
        <a
          href={seg.href}
          class={i === segments.length - 1
            ? 'text-foreground font-medium truncate'
            : 'text-muted hover:text-foreground truncate'}
        >
          {seg.label}
        </a>
      {/each}
    </nav>
  </div>

  <div class="flex items-center gap-2">
    <!-- Command palette trigger (Cmd+K) -->
    <button
      type="button"
      class="hidden h-9 items-center gap-2 rounded-md border border-default bg-surface-2 px-2.5 text-xs text-muted hover:bg-surface-3 md:flex"
      aria-label="Open command palette"
      onclick={() => (uiStore.commandPaletteOpen = true)}
    >
      <Search class="h-3.5 w-3.5" />
      <span>Search…</span>
      <span class="ml-3 flex items-center gap-0.5 rounded border border-default bg-surface-1 px-1 py-0.5">
        <Command class="h-3 w-3" />K
      </span>
    </button>

    <Notifications />
  </div>
</header>
