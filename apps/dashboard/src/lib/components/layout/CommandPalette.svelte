<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { uiStore } from '$lib/stores/ui.store.svelte';
  import { NAV_ITEMS, filterNav } from '$lib/config/nav.config';
  import { Search, ArrowRight, CornerDownLeft } from '@lucide/svelte';

  interface Item {
    label: string;
    href: string;
    group?: string;
    icon: typeof Search;
  }

  let inputEl: HTMLInputElement | null = $state(null);
  let query = $state('');
  let selectedIndex = $state(0);

  const allItems = $derived.by<Item[]>(() => {
    const perms = page.data.permissions ?? {};
    const mode = (page.data.org?.org?.mode ?? 'both') as 'fintech' | 'saas' | 'both';
    const groups = filterNav(NAV_ITEMS, perms, mode);
    return groups.flatMap((g) =>
      g.items.map((i) => ({ label: i.label, href: i.href, group: i.group, icon: i.icon }))
    );
  });

  const filtered = $derived.by<Item[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.href.toLowerCase().includes(q) ||
        (i.group ?? '').toLowerCase().includes(q)
    );
  });

  $effect(() => {
    // Reset selection when query changes
    selectedIndex = 0;
    void filtered;
  });

  function onGlobalKey(e: KeyboardEvent) {
    const isMod = e.metaKey || e.ctrlKey;
    if (isMod && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      uiStore.commandPaletteOpen = !uiStore.commandPaletteOpen;
    }
  }

  function onPaletteKey(e: KeyboardEvent) {
    if (!uiStore.commandPaletteOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(filtered.length - 1, selectedIndex + 1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(0, selectedIndex - 1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[selectedIndex];
      if (item) {
        void navigate(item.href);
      }
    }
  }

  async function navigate(href: string) {
    close();
    await goto(href);
  }

  function close() {
    uiStore.commandPaletteOpen = false;
    query = '';
    selectedIndex = 0;
  }

  $effect(() => {
    document.addEventListener('keydown', onGlobalKey);
    return () => document.removeEventListener('keydown', onGlobalKey);
  });

  $effect(() => {
    if (uiStore.commandPaletteOpen) {
      // Focus input on open
      queueMicrotask(() => inputEl?.focus());
    }
  });
</script>

<svelte:window onkeydown={onPaletteKey} />

{#if uiStore.commandPaletteOpen}
  <button
    type="button"
    class="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 pt-[15vh] backdrop-blur-sm"
    onclick={close}
    aria-label="Close command palette"
    tabindex="-1"
  ></button>
  <div class="pointer-events-none fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[15vh]">
    <div
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="Command palette"
      class="pointer-events-auto w-full max-w-xl overflow-hidden rounded-xl border border-default bg-[var(--popover)] text-[var(--popover-foreground)] shadow-2xl"
      data-testid="command-palette"
    >
      <div class="flex items-center gap-2 border-b border-default px-4 py-3">
        <Search class="h-4 w-4 text-muted" />
        <input
          bind:this={inputEl}
          bind:value={query}
          type="text"
          placeholder="Search pages and actions…"
          class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          aria-label="Command palette search"
          aria-controls="cmdk-results"
          aria-activedescendant={`cmdk-item-${selectedIndex}`}
          autocomplete="off"
          spellcheck="false"
        />
        <kbd class="rounded border border-default bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">ESC</kbd>
      </div>

      <ul id="cmdk-results" class="max-h-[50vh] overflow-y-auto py-1.5" role="listbox">
        {#if filtered.length === 0}
          <li class="px-4 py-6 text-center text-sm text-muted">No matches.</li>
        {:else}
          {#each filtered as item, i (item.href)}
            {@const Icon = item.icon}
            <li role="option" aria-selected={i === selectedIndex} id={`cmdk-item-${i}`}>
              <button
                type="button"
                class="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors {i === selectedIndex ? 'bg-surface-2 text-foreground' : 'text-muted hover:bg-surface-2'}"
                onclick={() => navigate(item.href)}
                onmouseenter={() => (selectedIndex = i)}
              >
                <Icon class="h-4 w-4 shrink-0" />
                <span class="flex-1">
                  {#if item.group}
                    <span class="text-xs text-subtle">{item.group} / </span>
                  {/if}
                  <span class="text-foreground">{item.label}</span>
                </span>
                <ArrowRight class="h-3.5 w-3.5 opacity-50" />
              </button>
            </li>
          {/each}
        {/if}
      </ul>

      <div class="flex items-center justify-between border-t border-default bg-surface-2 px-4 py-2 text-[11px] text-muted">
        <span class="flex items-center gap-1">
          <kbd class="rounded border border-default bg-[var(--background)] px-1.5 py-0.5">↑↓</kbd>
          to navigate
        </span>
        <span class="flex items-center gap-1">
          <kbd class="rounded border border-default bg-[var(--background)] px-1.5 py-0.5">
            <CornerDownLeft class="inline h-3 w-3" />
          </kbd>
          to select
        </span>
      </div>
    </div>
  </div>
{/if}
