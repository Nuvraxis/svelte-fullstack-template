<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { Mail, Check, X, Lock, UserPlus } from '@lucide/svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import SlideOver from '$lib/components/SlideOver.svelte';
  import { formatRelativeDate } from '$lib/utils/formatters';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showInvite = $state(false);
  let inviteSubmitting = $state(false);

  $effect(() => {
    if (form?.invite && 'success' in form.invite && form.invite.success) {
      showInvite = false;
    }
  });

  interface Member {
    id: string;
    status: string;
    joined_at: string | null;
    user_profiles: { id: string; full_name: string; email: string; avatar_url: string | null };
    roles: { id: string; name: string; display_name: string };
  }

  const members = $derived(data.members as unknown as Member[]);
  const canManage = $derived(page.data.permissions?.['team:manage'] === true);

  function initials(name: string): string {
    return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  function selectMember(userId: string) {
    const params = new URLSearchParams(page.url.searchParams);
    params.set('user', userId);
    goto(`?${params.toString()}`, { noScroll: true, keepFocus: true });
  }

  function closeDetail() {
    const params = new URLSearchParams(page.url.searchParams);
    params.delete('user');
    const qs = params.toString();
    goto(qs ? `?${qs}` : page.url.pathname, { noScroll: true });
  }

  // Resolve the effective state of a permission key for the selected user:
  //  'role'    — granted via role membership only
  //  'grant'   — explicit grant override (above role)
  //  'deny'    — explicit deny override
  //  'none'    — not granted, no override
  function effectiveState(resource: string, action: string): 'role' | 'grant' | 'deny' | 'none' {
    if (!data.selectedDetail) return 'none';
    const ov = data.selectedDetail.overrides.find(
      (o) => o.resource === resource && o.action === action && o.resource_id === null
    );
    if (ov && !ov.granted) return 'deny';
    if (ov && ov.granted) return 'grant';
    const inRole = data.selectedDetail.role_permissions.some(
      (p) => p.resource === resource && p.action === action
    );
    return inRole ? 'role' : 'none';
  }

  // Group catalog by resource for nicer UX
  type CatalogEntry = { resource: string; action: string };
  const catalogByResource = $derived.by(() => {
    const groups: Record<string, CatalogEntry[]> = {};
    for (const p of data.catalog as CatalogEntry[]) {
      if (!groups[p.resource]) groups[p.resource] = [];
      groups[p.resource]!.push(p);
    }
    return groups;
  });
</script>

<svelte:head><title>Team · VaultFlow</title></svelte:head>

<header class="mb-6 flex flex-wrap items-start justify-between gap-3">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">Team</h1>
    <p class="mt-1 text-sm text-muted">
      {members.length} members · {canManage ? 'You can manage roles and per-resource grants' : 'Read-only'}
    </p>
  </div>
  {#if canManage}
    <Button onclick={() => (showInvite = !showInvite)} data-testid="invite-toggle">
      <UserPlus class="h-4 w-4" /> Invite member
    </Button>
  {/if}
</header>

{#if showInvite && canManage}
  <Card class="mb-5 p-5" data-testid="invite-form">
    <h2 class="mb-1 text-base font-semibold">Invite a teammate</h2>
    <p class="mb-4 text-xs text-muted">
      Creates a new user in your org. Default password is <code class="font-mono">Demo@1234</code>;
      the user can sign in immediately and reset it.
    </p>
    <form
      method="POST"
      action="?/inviteMember"
      use:enhance={() => {
        inviteSubmitting = true;
        return async ({ update }) => {
          await update();
          inviteSubmitting = false;
        };
      }}
      class="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]"
    >
      <div>
        <label for="invite-name" class="mb-1 block text-xs font-medium text-muted">Full name</label>
        <input
          id="invite-name"
          name="full_name"
          type="text"
          required
          minlength="1"
          maxlength="120"
          class="input-base w-full"
          placeholder="Ada Lovelace"
          autocomplete="off"
        />
      </div>
      <div>
        <label for="invite-email" class="mb-1 block text-xs font-medium text-muted">Email</label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          maxlength="200"
          class="input-base w-full"
          placeholder="ada@novapay.io"
          autocomplete="off"
        />
      </div>
      <div>
        <label for="invite-role" class="mb-1 block text-xs font-medium text-muted">Role</label>
        <select id="invite-role" name="role_id" required class="input-base w-full">
          {#each data.roles as r (r.id)}
            <option value={r.id}>{r.display_name}</option>
          {/each}
        </select>
      </div>
      <div class="flex items-end gap-2">
        <Button type="submit" disabled={inviteSubmitting} data-testid="invite-submit">
          {inviteSubmitting ? 'Inviting…' : 'Send invite'}
        </Button>
        <Button type="button" variant="ghost" onclick={() => (showInvite = false)}>Cancel</Button>
      </div>
      {#if form?.invite && 'error' in form.invite}
        <p class="md:col-span-4 text-xs text-danger" role="alert">{form.invite.error}</p>
      {/if}
      {#if form?.invite && 'success' in form.invite}
        <p class="md:col-span-4 text-xs text-success" role="status">
          Invite sent to {form.invite.email}.
        </p>
      {/if}
    </form>
  </Card>
{/if}

<Card>
  <ul class="divide-y divide-[var(--color-border-subtle)]">
    {#each members as m (m.id)}
      {@const u = m.user_profiles}
      <li
        class="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2"
      >
        <div class="flex min-w-0 items-center gap-3">
          <span
            class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white"
            aria-hidden="true"
          >{initials(u.full_name)}</span>
          <div class="min-w-0">
            <div class="truncate text-sm font-medium">{u.full_name}</div>
            <div class="flex items-center gap-1.5 text-xs text-muted">
              <Mail class="h-3 w-3" />
              <span class="truncate">{u.email}</span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{m.roles.display_name}</Badge>
          <span class="text-xs text-subtle">
            joined {m.joined_at ? formatRelativeDate(m.joined_at) : '—'}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onclick={() => selectMember(u.id)}
            data-testid={`view-${u.email.split('@')[0]}`}
          >
            Permissions →
          </Button>
        </div>
      </li>
    {/each}
  </ul>
</Card>

<!-- Per-user permissions slide-over -->
{#if data.selectedDetail}
  {@const dm = data.selectedDetail.member as unknown as Member}
  <SlideOver
    open={true}
    title={dm.user_profiles.full_name}
    description={`${dm.roles.display_name} · per-resource permissions`}
    width="xl"
    onClose={closeDetail}
  >
    {#if canManage}
      <!-- Change role -->
      <form method="POST" action="?/changeRole" use:enhance class="mb-5 flex items-end gap-2 rounded-lg border border-default bg-surface-2 p-3">
        <input type="hidden" name="user_id" value={dm.user_profiles.id} />
        <div class="flex-1">
          <label for="role-select" class="block text-xs font-medium text-muted mb-1">Role</label>
          <select id="role-select" name="role_id" class="input-base w-full text-sm" value={dm.roles.id}>
            {#each data.roles as r (r.id)}
              <option value={r.id}>{r.display_name}</option>
            {/each}
          </select>
        </div>
        <Button size="sm" type="submit">Save role</Button>
      </form>
    {/if}

    <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">
      Permission matrix
    </h3>
    <p class="mb-3 text-xs text-muted">
      Role-derived permissions are shown in indigo. Override them per-user with an explicit grant or deny.
    </p>

    <div class="space-y-4">
      {#each Object.entries(catalogByResource) as [resource, entries] (resource)}
        <div class="rounded-lg border border-default bg-surface-2 p-3">
          <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            {resource.replace(/_/g, ' ')}
          </h4>
          <ul class="space-y-1.5">
            {#each entries as p (p.action)}
              {@const state = effectiveState(p.resource, p.action)}
              <li class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2">
                  <span class="capitalize text-foreground">{p.action}</span>
                  {#if state === 'role'}
                    <Badge tone="brand">via role</Badge>
                  {:else if state === 'grant'}
                    <Badge tone="success">override grant</Badge>
                  {:else if state === 'deny'}
                    <Badge tone="danger">override deny</Badge>
                  {/if}
                </div>
                {#if canManage}
                  <div class="flex gap-1">
                    <form method="POST" action="?/togglePermission" use:enhance>
                      <input type="hidden" name="user_id" value={dm.user_profiles.id} />
                      <input type="hidden" name="resource" value={p.resource} />
                      <input type="hidden" name="action" value={p.action} />
                      <input type="hidden" name="state" value="grant" />
                      <button
                        type="submit"
                        class="rounded-md p-1.5 transition-colors {state === 'grant' ? 'bg-success/20 text-success' : 'text-muted hover:bg-surface-3'}"
                        aria-label="Grant {p.resource}:{p.action}"
                        title="Grant"
                        data-testid={`grant-${p.resource}-${p.action}`}
                      ><Check class="h-3.5 w-3.5" /></button>
                    </form>
                    <form method="POST" action="?/togglePermission" use:enhance>
                      <input type="hidden" name="user_id" value={dm.user_profiles.id} />
                      <input type="hidden" name="resource" value={p.resource} />
                      <input type="hidden" name="action" value={p.action} />
                      <input type="hidden" name="state" value="deny" />
                      <button
                        type="submit"
                        class="rounded-md p-1.5 transition-colors {state === 'deny' ? 'bg-danger/20 text-danger' : 'text-muted hover:bg-surface-3'}"
                        aria-label="Deny {p.resource}:{p.action}"
                        title="Deny"
                      ><X class="h-3.5 w-3.5" /></button>
                    </form>
                    {#if state === 'grant' || state === 'deny'}
                      <form method="POST" action="?/togglePermission" use:enhance>
                        <input type="hidden" name="user_id" value={dm.user_profiles.id} />
                        <input type="hidden" name="resource" value={p.resource} />
                        <input type="hidden" name="action" value={p.action} />
                        <input type="hidden" name="state" value="clear" />
                        <button
                          type="submit"
                          class="rounded-md p-1.5 text-muted hover:bg-surface-3"
                          aria-label="Clear override"
                          title="Clear override"
                        ><span class="text-xs">↺</span></button>
                      </form>
                    {/if}
                  </div>
                {:else}
                  <Lock class="h-3.5 w-3.5 text-subtle" aria-hidden="true" />
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </SlideOver>
{/if}
