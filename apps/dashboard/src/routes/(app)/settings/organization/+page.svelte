<script lang="ts">
  import { page } from '$app/state';
  import { enhance } from '$app/forms';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Label from '$lib/components/ui/Label.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const org = $derived(page.data.org?.org);
  const canEdit = $derived(data.canEdit);
  let submitting = $state(false);

  const MODES = [
    { value: 'both', label: 'Both — Fintech & SaaS' },
    { value: 'fintech', label: 'Fintech only' },
    { value: 'saas', label: 'SaaS only' }
  ];
</script>

<svelte:head><title>Organization · VaultFlow</title></svelte:head>

<Card class="p-6">
  <div class="mb-5 flex items-start justify-between gap-3">
    <div>
      <h2 class="mb-1 text-lg font-semibold">Organization</h2>
      <p class="text-sm text-muted">Workspace name, slug, and product mode.</p>
    </div>
    <Badge tone={org?.plan === 'enterprise' ? 'brand' : 'neutral'}>
      {org?.plan ?? '—'} plan
    </Badge>
  </div>

  <form
    method="POST"
    action="?/update"
    use:enhance={() => {
      submitting = true;
      return async ({ update }) => {
        await update();
        submitting = false;
      };
    }}
    class="max-w-md space-y-4"
  >
    <div>
      <Label for="org-name">Name</Label>
      <Input id="org-name" name="name" required maxlength={120} value={org?.name ?? ''} disabled={!canEdit} />
    </div>
    <div>
      <Label for="org-slug">Slug</Label>
      <Input
        id="org-slug"
        name="slug"
        required
        minlength={2}
        maxlength={60}
        pattern="[a-z0-9-]+"
        value={org?.slug ?? ''}
        disabled={!canEdit}
      />
      <p class="mt-1 text-xs text-subtle">Lowercase letters, numbers, and hyphens only.</p>
    </div>
    <div>
      <Label for="org-mode">Product mode</Label>
      <select id="org-mode" name="mode" class="input-base w-full" value={org?.mode ?? 'both'} disabled={!canEdit}>
        {#each MODES as m (m.value)}
          <option value={m.value}>{m.label}</option>
        {/each}
      </select>
      <p class="mt-1 text-xs text-subtle">Controls which modules appear in the sidebar.</p>
    </div>
    <div>
      <Label for="org-logo">Logo URL <span class="text-subtle">(optional)</span></Label>
      <Input
        id="org-logo"
        name="logo_url"
        type="url"
        placeholder="https://example.com/logo.svg"
        value={org?.logo_url ?? ''}
        disabled={!canEdit}
      />
    </div>

    {#if form?.error}
      <p class="text-sm text-danger" role="alert">{form.error}</p>
    {/if}
    {#if form?.success}
      <p class="text-sm text-success" role="status">Organization saved.</p>
    {/if}

    {#if canEdit}
      <div class="flex justify-end pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    {:else}
      <p class="rounded-md border border-default bg-surface-2 px-3 py-2 text-xs text-muted">
        Read-only — you need <code class="font-mono">settings:update</code> permission to edit.
      </p>
    {/if}
  </form>
</Card>
