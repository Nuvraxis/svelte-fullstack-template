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

  const errs = $derived(form?.errors);
  const msg = $derived(form?.message);
</script>

<svelte:head>
  <title>Create account · VaultFlow</title>
</svelte:head>

<Card class="p-6">
  <h2 class="mb-1 text-lg font-semibold">Create your workspace</h2>
  <p class="mb-5 text-sm text-muted">Start your 14-day trial. No credit card.</p>

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
    {#if msg}
      <div
        role={msg.type === 'error' ? 'alert' : 'status'}
        class="rounded-md border px-3 py-2 text-sm {msg.type === 'error'
          ? 'border-danger/40 bg-[var(--color-danger-bg)] text-danger'
          : 'border-success/40 bg-[var(--color-success-bg)] text-success'}"
      >
        {msg.text}
      </div>
    {/if}

    <div>
      <Label for="org_name">Organization name</Label>
      <Input id="org_name" name="org_name" type="text" required placeholder="Acme Inc." value={form?.org_name ?? ''} invalid={!!errs?.org_name} />
      {#if errs?.org_name}<p class="mt-1 text-xs text-danger">{errs.org_name}</p>{/if}
    </div>

    <div>
      <Label for="full_name">Your full name</Label>
      <Input id="full_name" name="full_name" type="text" autocomplete="name" required value={form?.full_name ?? ''} invalid={!!errs?.full_name} />
      {#if errs?.full_name}<p class="mt-1 text-xs text-danger">{errs.full_name}</p>{/if}
    </div>

    <div>
      <Label for="email">Work email</Label>
      <Input id="email" name="email" type="email" autocomplete="email" required value={form?.email ?? ''} invalid={!!errs?.email} />
      {#if errs?.email}<p class="mt-1 text-xs text-danger">{errs.email}</p>{/if}
    </div>

    <div>
      <Label for="password">Password</Label>
      <Input id="password" name="password" type="password" autocomplete="new-password" required invalid={!!errs?.password} />
      {#if errs?.password}<p class="mt-1 text-xs text-danger">{errs.password}</p>{/if}
    </div>

    <div>
      <Label for="confirm">Confirm password</Label>
      <Input id="confirm" name="confirm" type="password" autocomplete="new-password" required invalid={!!errs?.confirm} />
      {#if errs?.confirm}<p class="mt-1 text-xs text-danger">{errs.confirm}</p>{/if}
    </div>

    <Button type="submit" class="w-full" disabled={submitting}>
      {#if submitting}<Loader2 class="h-4 w-4 animate-spin" />{/if}
      Create account
    </Button>
  </form>
</Card>

<p class="mt-4 text-center text-sm text-muted">
  Already have an account?
  <a href="/login" class="text-brand-400 hover:text-brand-300">Sign in</a>
</p>
