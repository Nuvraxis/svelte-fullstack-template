<script lang="ts">
  import { page } from '$app/state';
  import { invalidateAll } from '$app/navigation';
  import { Bell, ShieldAlert, CreditCard, TrendingDown, UserPlus, FileBarChart2, CheckCheck } from '@lucide/svelte';
  import { formatRelativeDate } from '$lib/utils/formatters';

  let open = $state(false);
  let triggerEl: HTMLButtonElement | null = $state(null);
  let panelEl: HTMLDivElement | null = $state(null);

  interface NotificationItem {
    id: string;
    type: string;
    title: string;
    body: string;
    read: boolean;
    created_at: string;
  }

  const items = $derived((page.data.notifications?.items ?? []) as NotificationItem[]);
  const unread = $derived(page.data.notifications?.unread ?? 0);

  const ICONS: Record<string, typeof Bell> = {
    fraud_alert: ShieldAlert,
    payment_failed: CreditCard,
    churn_risk: TrendingDown,
    invite: UserPlus,
    report: FileBarChart2
  };

  function iconFor(type: string) {
    return ICONS[type] ?? Bell;
  }

  function onDocClick(e: MouseEvent) {
    if (!open) return;
    const t = e.target as Node;
    if (panelEl?.contains(t) || triggerEl?.contains(t)) return;
    open = false;
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      open = false;
      triggerEl?.focus();
    }
  }

  $effect(() => {
    if (!open) return;
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  });

  async function markRead(id: string) {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id })
    });
    await invalidateAll();
  }

  async function markAllRead() {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ all: true })
    });
    await invalidateAll();
  }
</script>

<div class="relative">
  <button
    bind:this={triggerEl}
    class="btn-ghost relative p-2"
    aria-label="Notifications ({unread} unread)"
    aria-haspopup="true"
    aria-expanded={open}
    onclick={() => (open = !open)}
    data-testid="notifications-bell"
  >
    <Bell class="h-5 w-5" />
    {#if unread > 0}
      <span
        class="absolute right-1 top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-semibold leading-none text-[var(--primary-foreground)] ring-2 ring-[var(--background)]"
        aria-hidden="true"
      >{unread > 9 ? '9+' : unread}</span>
    {/if}
  </button>

  {#if open}
    <div
      bind:this={panelEl}
      role="dialog"
      aria-label="Notifications"
      class="absolute right-0 top-full z-40 mt-2 w-[min(380px,calc(100vw-1rem))] overflow-hidden rounded-lg border border-default bg-[var(--popover)] text-[var(--popover-foreground)] shadow-xl"
      data-testid="notifications-panel"
    >
      <div class="flex items-center justify-between gap-2 border-b border-default px-4 py-2.5">
        <h3 class="text-sm font-semibold">Notifications</h3>
        {#if unread > 0}
          <button
            type="button"
            class="flex items-center gap-1 text-xs text-muted hover:text-foreground"
            onclick={markAllRead}
          >
            <CheckCheck class="h-3.5 w-3.5" /> Mark all read
          </button>
        {/if}
      </div>

      {#if items.length === 0}
        <div class="px-4 py-8 text-center text-sm text-muted">
          You're all caught up.
        </div>
      {:else}
        <ul class="max-h-[60vh] overflow-y-auto">
          {#each items as n (n.id)}
            {@const Icon = iconFor(n.type)}
            <li class="border-b border-default last:border-b-0">
              <button
                type="button"
                onclick={() => !n.read && markRead(n.id)}
                class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 {n.read ? 'opacity-70' : ''}"
              >
                <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)]" aria-hidden="true">
                  <Icon class="h-4 w-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-medium leading-snug">{n.title}</p>
                    {#if !n.read}
                      <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" aria-label="Unread"></span>
                    {/if}
                  </div>
                  <p class="mt-0.5 text-xs text-muted line-clamp-2">{n.body}</p>
                  <p class="mt-1 text-xs text-subtle">{formatRelativeDate(n.created_at)}</p>
                </div>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>
