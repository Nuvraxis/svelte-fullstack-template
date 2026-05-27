<script lang="ts">
  import { page } from '$app/state';
  import { enhance } from '$app/forms';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Label from '$lib/components/ui/Label.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const user = $derived(page.data.user);
  let submitting = $state(false);
</script>

<svelte:head><title>Profile · VaultFlow</title></svelte:head>

<Card class="p-6">
  <h2 class="mb-1 text-lg font-semibold">Profile</h2>
  <p class="mb-5 text-sm text-muted">Personal information for your account.</p>

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
      <Label for="full_name">Full name</Label>
      <Input id="full_name" name="full_name" required maxlength={120} value={user?.full_name ?? ''} />
    </div>
    <div>
      <Label for="email">Email</Label>
      <Input id="email" name="email" type="email" value={user?.email ?? ''} disabled />
      <p class="mt-1 text-xs text-subtle">Email changes require reverification — contact an admin.</p>
    </div>
    <div>
      <Label for="timezone">Timezone</Label>
      <select id="timezone" name="timezone" class="input-base w-full" value={user?.timezone ?? 'UTC'}>
        {#each data.timezones as tz (tz)}
          <option value={tz}>{tz}</option>
        {/each}
      </select>
    </div>
    <div>
      <Label for="avatar_url">Avatar URL <span class="text-subtle">(optional)</span></Label>
      <Input
        id="avatar_url"
        name="avatar_url"
        type="url"
        placeholder="https://example.com/avatar.png"
        value={user?.avatar_url ?? ''}
      />
    </div>

    {#if form?.error}
      <p class="text-sm text-danger" role="alert">{form.error}</p>
    {/if}
    {#if form?.success}
      <p class="text-sm text-success" role="status">Profile saved.</p>
    {/if}

    <div class="flex justify-end pt-2">
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  </form>
</Card>
