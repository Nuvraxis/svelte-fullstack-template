<script lang="ts">
  import { enhance } from '$app/forms';
  import { Loader2 } from '@lucide/svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Label from '$lib/components/ui/Label.svelte';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let submitting = $state(false);
</script>

<svelte:head>
  <title>Reset password · VaultFlow</title>
</svelte:head>

<Card class="p-6">
  <h2 class="mb-1 text-lg font-semibold">Reset password</h2>
  <p class="mb-5 text-sm text-muted">We'll email you a reset link.</p>

  <form
    method="POST"
    use:enhance={() => {
      submitting = true;
      return async ({ update }) => {
        await update();
        submitting = false;
      };
    }}
    class="space-y-4"
    novalidate
  >
    {#if form?.message}
      <div
        role={form.message.type === 'error' ? 'alert' : 'status'}
        class="rounded-md border px-3 py-2 text-sm {form.message.type === 'error'
          ? 'border-danger/40 bg-[var(--color-danger-bg)] text-danger'
          : 'border-success/40 bg-[var(--color-success-bg)] text-success'}"
      >
        {form.message.text}
      </div>
    {/if}

    <div>
      <Label for="email">Email</Label>
      <Input
        id="email"
        name="email"
        type="email"
        autocomplete="email"
        required
        value={form?.email ?? ''}
        invalid={!!form?.errors?.email}
      />
      {#if form?.errors?.email}<p class="mt-1 text-xs text-danger">{form.errors.email}</p>{/if}
    </div>

    <Button type="submit" class="w-full" disabled={submitting}>
      {#if submitting}<Loader2 class="h-4 w-4 animate-spin" />{/if}
      Send reset link
    </Button>
  </form>
</Card>

<p class="mt-4 text-center text-sm text-muted">
  Remembered it?
  <a href="/login" class="text-brand-400 hover:text-brand-300">Back to sign in</a>
</p>
