<script lang="ts">
  import { enhance } from '$app/forms';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Label from '$lib/components/ui/Label.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { Key, Copy, Trash2, ShieldCheck } from '@lucide/svelte';
  import { formatRelativeDate } from '$lib/utils/formatters';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showCreate = $state(false);
  let creating = $state(false);
  let copied = $state(false);

  $effect(() => {
    if (form?.created) {
      showCreate = false;
    }
  });

  async function copyKey() {
    if (!form?.created?.plaintext) return;
    await navigator.clipboard.writeText(form.created.plaintext);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<svelte:head><title>API keys · VaultFlow</title></svelte:head>

<header class="mb-6 flex flex-wrap items-start justify-between gap-3">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">API keys</h1>
    <p class="mt-1 text-sm text-muted">
      Personal API keys for accessing VaultFlow from external scripts. Plaintext is shown once at creation.
    </p>
  </div>
  <Button onclick={() => (showCreate = !showCreate)} data-testid="create-key-toggle">
    <Key class="h-4 w-4" /> New API key
  </Button>
</header>

{#if form?.created}
  <Card class="mb-5 border-[var(--primary)]/40 bg-[var(--primary)]/5 p-5">
    <div class="flex items-start gap-3">
      <ShieldCheck class="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
      <div class="min-w-0 flex-1">
        <h3 class="text-sm font-semibold">Key created — copy it now</h3>
        <p class="mt-0.5 text-xs text-muted">
          “{form.created.name}” — this is the only time you'll see the full secret.
        </p>
        <div class="mt-3 flex items-center gap-2 rounded-md border border-default bg-surface-1 px-3 py-2 font-mono text-xs">
          <code class="flex-1 truncate" data-testid="created-key-value">{form.created.plaintext}</code>
          <button
            type="button"
            class="btn-ghost p-1.5"
            onclick={copyKey}
            aria-label="Copy key"
          >
            <Copy class="h-3.5 w-3.5" />
          </button>
        </div>
        {#if copied}
          <p class="mt-2 text-xs text-success">Copied to clipboard.</p>
        {/if}
      </div>
    </div>
  </Card>
{/if}

{#if showCreate}
  <Card class="mb-5 p-5">
    <h2 class="mb-1 text-base font-semibold">Create API key</h2>
    <p class="mb-4 text-xs text-muted">Pick the smallest scope set that works.</p>
    <form
      method="POST"
      action="?/create"
      use:enhance={() => {
        creating = true;
        return async ({ update }) => {
          await update();
          creating = false;
        };
      }}
      class="grid gap-3 md:grid-cols-[1fr_auto]"
    >
      <div>
        <Label for="key-name">Name</Label>
        <Input id="key-name" name="name" required maxlength={80} placeholder="e.g. analytics-cron" />
      </div>
      <div class="flex items-end">
        <fieldset class="flex gap-3 pb-2">
          <legend class="sr-only">Scopes</legend>
          <label class="flex items-center gap-1.5 text-xs">
            <input type="checkbox" name="scopes" value="read" checked class="h-4 w-4 accent-[var(--primary)]" />
            read
          </label>
          <label class="flex items-center gap-1.5 text-xs">
            <input type="checkbox" name="scopes" value="write" class="h-4 w-4 accent-[var(--primary)]" />
            write
          </label>
        </fieldset>
      </div>
      <div class="flex justify-end gap-2 md:col-span-2">
        <Button type="button" variant="ghost" onclick={() => (showCreate = false)}>Cancel</Button>
        <Button type="submit" disabled={creating} data-testid="create-key-submit">
          {creating ? 'Creating…' : 'Create key'}
        </Button>
      </div>
      {#if form?.error}
        <p class="text-sm text-danger md:col-span-2" role="alert">{form.error}</p>
      {/if}
    </form>
  </Card>
{/if}

<Card>
  {#if data.keys.length === 0}
    <div class="px-6 py-12 text-center text-sm text-muted">
      You don't have any API keys yet. Create one above.
    </div>
  {:else}
    <ul class="divide-y divide-[var(--color-border-subtle)]">
      {#each data.keys as k (k.id)}
        <li class="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <div class="flex min-w-0 items-center gap-3">
            <div class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-3">
              <Key class="h-4 w-4 text-muted" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="truncate text-sm font-medium">{k.name}</span>
                {#if k.revoked_at}
                  <Badge tone="danger">revoked</Badge>
                {:else}
                  {#each k.scopes as s (s)}
                    <Badge tone="neutral">{s}</Badge>
                  {/each}
                {/if}
              </div>
              <div class="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-subtle">
                <span class="font-mono">{k.prefix}…</span>
                <span>created {formatRelativeDate(k.created_at)}</span>
                <span>
                  {k.last_used_at ? `last used ${formatRelativeDate(k.last_used_at)}` : 'never used'}
                </span>
              </div>
            </div>
          </div>
          {#if !k.revoked_at}
            <form method="POST" action="?/revoke" use:enhance>
              <input type="hidden" name="key_id" value={k.id} />
              <Button
                size="sm"
                variant="ghost"
                type="submit"
                data-testid={`revoke-${k.id}`}
              >
                <Trash2 class="h-3.5 w-3.5" /> Revoke
              </Button>
            </form>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</Card>
