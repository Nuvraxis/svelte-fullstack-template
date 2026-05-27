<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { X } from '@lucide/svelte';

  interface Props {
    open: boolean;
    title?: string;
    description?: string;
    width?: 'sm' | 'md' | 'lg' | 'xl';
    onClose: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  let { open, title, description, width = 'md', onClose, children, footer }: Props = $props();

  const widthClass = $derived(
    width === 'sm' ? 'max-w-sm' :
    width === 'lg' ? 'max-w-2xl' :
    width === 'xl' ? 'max-w-4xl' : 'max-w-lg'
  );

  let dialogEl: HTMLDivElement | undefined = $state();

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  // Focus trap: when opened, move focus to the panel. Restore on close.
  let previousFocus: HTMLElement | null = null;
  $effect(() => {
    if (!open) return;
    previousFocus = document.activeElement as HTMLElement | null;
    queueMicrotask(() => dialogEl?.focus());
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      previousFocus?.focus();
    };
  });
</script>

<svelte:window on:keydown={open ? onKeyDown : undefined} />

{#if open}
  <!-- Backdrop -->
  <button
    type="button"
    aria-label="Close panel"
    class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
    transition:fade={{ duration: 150 }}
    onclick={onClose}
  ></button>

  <!-- Panel -->
  <div
    bind:this={dialogEl}
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'slideover-title' : undefined}
    aria-describedby={description ? 'slideover-desc' : undefined}
    tabindex="-1"
    class="fixed inset-y-0 right-0 z-50 flex w-full {widthClass} flex-col border-l border-default bg-surface-1 shadow-elevated focus:outline-none sm:w-[90vw]"
    transition:fly={{ x: 400, duration: 200 }}
  >
    {#if title || description}
      <header class="flex items-start justify-between gap-3 border-b border-default p-5">
        <div class="min-w-0">
          {#if title}
            <h2 id="slideover-title" class="truncate text-base font-semibold">{title}</h2>
          {/if}
          {#if description}
            <p id="slideover-desc" class="mt-1 text-sm text-muted">{description}</p>
          {/if}
        </div>
        <button
          type="button"
          aria-label="Close"
          class="btn-ghost shrink-0 p-1.5"
          onclick={onClose}
        >
          <X class="h-5 w-5" />
        </button>
      </header>
    {/if}

    <div class="flex-1 overflow-y-auto p-5">
      {@render children()}
    </div>

    {#if footer}
      <footer class="border-t border-default bg-surface-0 p-4">
        {@render footer()}
      </footer>
    {/if}
  </div>
{/if}
