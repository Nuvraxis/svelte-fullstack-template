<script lang="ts">
  import { page } from '$app/state';
  import { ChevronUp, LogOut, User, Settings as SettingsIcon } from '@lucide/svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    compact?: boolean;
  }
  let { compact = false }: Props = $props();

  let open = $state(false);
  const user = $derived(page.data.user);
  const role = $derived(page.data.org?.role.display_name ?? 'Member');

  function initials(name: string | null | undefined): string {
    if (!name) return '?';
    return name
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-user-menu]')) open = false;
  }

  $effect(() => {
    if (!open) return;
    // mousedown (capture: false) fires AFTER the originating click has finished
    // propagating, so it won't race with the trigger's onclick toggle.
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });
</script>

<div class="relative" data-user-menu>
  <button
    type="button"
    class={cn(
      'flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-surface-2',
      compact && 'justify-center'
    )}
    aria-haspopup="menu"
    aria-expanded={open}
    onclick={() => (open = !open)}
    data-testid="user-menu-trigger"
  >
    <span
      class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white"
      aria-hidden="true"
    >
      {initials(user?.full_name)}
    </span>
    {#if !compact}
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-medium text-foreground">
          {user?.full_name ?? 'Loading…'}
        </span>
        <span class="block truncate text-xs text-muted">{role}</span>
      </span>
      <ChevronUp class="h-4 w-4 shrink-0 text-muted" />
    {/if}
  </button>

  {#if open}
    <div
      role="menu"
      class="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-md border border-default bg-surface-2 py-1 shadow-elevated"
    >
      <a
        href="/settings/profile"
        role="menuitem"
        class="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-3"
      >
        <User class="h-4 w-4 text-muted" />
        Profile
      </a>
      <a
        href="/settings/organization"
        role="menuitem"
        class="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-3"
      >
        <SettingsIcon class="h-4 w-4 text-muted" />
        Settings
      </a>
      <form method="POST" action="/auth/logout">
        <button
          type="submit"
          role="menuitem"
          data-testid="logout-button"
          class="flex w-full items-center gap-2 border-t border-default px-3 py-2 text-left text-sm text-foreground hover:bg-surface-3"
        >
          <LogOut class="h-4 w-4 text-muted" />
          Sign out
        </button>
      </form>
    </div>
  {/if}
</div>
