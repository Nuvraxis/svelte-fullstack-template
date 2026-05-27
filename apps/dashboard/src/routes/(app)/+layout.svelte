<script lang="ts">
  import type { Snippet } from 'svelte';
  import { uiStore } from '$lib/stores/ui.store.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Topbar from '$lib/components/layout/Topbar.svelte';
  import CommandPalette from '$lib/components/layout/CommandPalette.svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    children: Snippet;
  }
  let { children }: Props = $props();

  // user/org/permissions come from page.data — consumed directly by child
  // components rather than synced into a module store (avoids SSR singleton
  // leaks between concurrent requests).

  const sidebarWidth = $derived(uiStore.sidebarCollapsed ? 'md:pl-16' : 'md:pl-60');
</script>

<div class="min-h-screen bg-surface-0">
  <Sidebar />
  <div class={cn('flex min-h-screen flex-col transition-[padding] duration-200', sidebarWidth)}>
    <Topbar />
    <main id="main-content" class="flex-1 p-4 md:p-6 lg:p-8" tabindex="-1">
      {@render children()}
    </main>
  </div>
  <CommandPalette />
</div>
