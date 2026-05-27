<script lang="ts">
  import { page } from '$app/state';
  import { filterNav, NAV_ITEMS } from '$lib/config/nav.config';
  import { uiStore } from '$lib/stores/ui.store.svelte';
  import { APP_CONFIG } from '$lib/config/app.config';
  import { ChevronsLeft, ChevronsRight, X, Vault } from '@lucide/svelte';
  import { cn } from '$lib/utils/cn';
  import UserMenu from './UserMenu.svelte';

  // Read permissions directly from page.data — server-rendered, request-scoped.
  // Avoids the SSR-leak problem of a module-level rune store.
  const groups = $derived(
    filterNav(NAV_ITEMS, page.data.permissions ?? {}, APP_CONFIG.mode)
  );
  const isCollapsed = $derived(uiStore.sidebarCollapsed);
  const isMobileOpen = $derived(uiStore.mobileSidebarOpen);

  function isActive(href: string): boolean {
    if (href === '/dashboard') return page.url.pathname === '/dashboard';
    return page.url.pathname.startsWith(href);
  }
</script>

<!-- Mobile backdrop -->
{#if isMobileOpen}
  <button
    aria-label="Close menu"
    class="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
    onclick={() => uiStore.toggleMobileSidebar()}
  ></button>
{/if}

<aside
  class={cn(
    'fixed z-40 flex h-full flex-col border-r border-default bg-surface-1 transition-[width,transform] duration-200',
    isCollapsed ? 'md:w-16' : 'md:w-60',
    'w-72',
    isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
  )}
  aria-label="Primary navigation"
>
  <!-- Logo / Brand -->
  <div class="flex h-14 items-center justify-between border-b border-default px-4">
    <a href="/dashboard" class="flex items-center gap-2.5 font-semibold tracking-tight">
      <span
        class="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md"
        aria-hidden="true"
      >
        <Vault class="h-4 w-4" />
      </span>
      {#if !isCollapsed}
        <span class="text-base">{APP_CONFIG.branding.name}</span>
      {/if}
    </a>
    <button
      class="btn-ghost p-1 md:hidden"
      aria-label="Close menu"
      onclick={() => uiStore.toggleMobileSidebar()}
    >
      <X class="h-5 w-5" />
    </button>
  </div>

  <!-- Nav -->
  <nav class="flex-1 overflow-y-auto px-2 py-3" data-testid="primary-nav">
    {#each groups as group (group.group ?? 'root')}
      {#if group.group && !isCollapsed}
        <div
          class="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-subtle"
        >
          {group.group}
        </div>
      {/if}
      <ul class="space-y-0.5">
        {#each group.items as item (item.href)}
          {@const Icon = item.icon}
          <li>
            <a
              href={item.href}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              class={cn(
                'group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
                isActive(item.href)
                  ? 'bg-brand-600/15 text-brand-300'
                  : 'text-muted hover:bg-surface-2 hover:text-foreground'
              )}
              aria-current={isActive(item.href) ? 'page' : undefined}
              onclick={() => uiStore.mobileSidebarOpen && uiStore.toggleMobileSidebar()}
            >
              <Icon class="h-4 w-4 shrink-0" aria-hidden="true" />
              {#if !isCollapsed}
                <span class="truncate">{item.label}</span>
              {/if}
            </a>
          </li>
        {/each}
      </ul>
    {/each}
  </nav>

  <!-- Footer: collapse toggle + user menu -->
  <div class="mt-auto border-t border-default p-2">
    <button
      class="hidden w-full items-center justify-center rounded-md p-2 text-muted hover:bg-surface-2 hover:text-foreground md:flex"
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      onclick={() => uiStore.toggleSidebar()}
    >
      {#if isCollapsed}
        <ChevronsRight class="h-4 w-4" />
      {:else}
        <ChevronsLeft class="h-4 w-4" />
      {/if}
    </button>
    <UserMenu compact={isCollapsed} />
  </div>
</aside>
