<script lang="ts">
  import { enhance } from '$app/forms';
  import { Mail, Lock, Loader2 } from '@lucide/svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Label from '$lib/components/ui/Label.svelte';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();

  let useMagic = $state(false);
  let submitting = $state(false);

  const loginEmail = $derived(form?.action === 'login' ? form.email : '');
  const loginErrors = $derived(form?.action === 'login' ? form.errors : undefined);
  const loginMessage = $derived(form?.action === 'login' ? form.message : undefined);

  const magicEmail = $derived(form?.action === 'magic' ? form.email : '');
  const magicErrors = $derived(form?.action === 'magic' ? form.errors : undefined);
  const magicMessage = $derived(form?.action === 'magic' ? form.message : undefined);
</script>

<svelte:head>
  <title>Sign in · VaultFlow</title>
</svelte:head>

<Card class="p-6">
  <h2 class="mb-1 text-lg font-semibold">Welcome back</h2>
  <p class="mb-5 text-sm text-muted">
    {useMagic ? 'Send yourself a sign-in link.' : 'Sign in to your account.'}
  </p>

  {#if !useMagic}
    <form
      method="POST"
      action="?/login"
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
      {#if loginMessage?.type === 'error'}
        <div
          role="alert"
          class="rounded-md border border-danger/40 bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-danger"
        >
          {loginMessage.text}
        </div>
      {/if}

      <div>
        <Label for="email">Email</Label>
        <div class="relative">
          <Mail class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <Input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            required
            placeholder="you@company.com"
            value={loginEmail}
            invalid={!!loginErrors?.email}
            class="pl-9"
            aria-describedby={loginErrors?.email ? 'email-err' : undefined}
            data-testid="login-email"
          />
        </div>
        {#if loginErrors?.email}
          <p id="email-err" class="mt-1 text-xs text-danger">{loginErrors.email}</p>
        {/if}
      </div>

      <div>
        <div class="flex items-center justify-between">
          <Label for="password">Password</Label>
          <a href="/forgot-password" class="text-xs text-brand-400 hover:text-brand-300">Forgot?</a>
        </div>
        <div class="relative">
          <Lock class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <Input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="••••••••"
            invalid={!!loginErrors?.password}
            class="pl-9"
            aria-describedby={loginErrors?.password ? 'pw-err' : undefined}
            data-testid="login-password"
          />
        </div>
        {#if loginErrors?.password}
          <p id="pw-err" class="mt-1 text-xs text-danger">{loginErrors.password}</p>
        {/if}
      </div>

      <Button type="submit" class="w-full" disabled={submitting} data-testid="login-submit">
        {#if submitting}<Loader2 class="h-4 w-4 animate-spin" />{/if}
        Sign in
      </Button>
    </form>
  {:else}
    <form
      method="POST"
      action="?/magic"
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
      {#if magicMessage}
        <div
          role={magicMessage.type === 'error' ? 'alert' : 'status'}
          class="rounded-md border px-3 py-2 text-sm {magicMessage.type === 'error'
            ? 'border-danger/40 bg-[var(--color-danger-bg)] text-danger'
            : 'border-success/40 bg-[var(--color-success-bg)] text-success'}"
        >
          {magicMessage.text}
        </div>
      {/if}

      <div>
        <Label for="magic-email">Email</Label>
        <div class="relative">
          <Mail class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <Input
            id="magic-email"
            name="email"
            type="email"
            autocomplete="email"
            required
            placeholder="you@company.com"
            value={magicEmail}
            invalid={!!magicErrors?.email}
            class="pl-9"
          />
        </div>
        {#if magicErrors?.email}
          <p class="mt-1 text-xs text-danger">{magicErrors.email}</p>
        {/if}
      </div>

      <Button type="submit" class="w-full" disabled={submitting}>
        {#if submitting}<Loader2 class="h-4 w-4 animate-spin" />{/if}
        Send magic link
      </Button>
    </form>
  {/if}

  <button
    type="button"
    class="mt-4 w-full text-center text-xs text-muted hover:text-foreground"
    onclick={() => (useMagic = !useMagic)}
  >
    {useMagic ? '← Use password instead' : 'Sign in with a magic link instead →'}
  </button>
</Card>

<p class="mt-4 text-center text-sm text-muted">
  Don't have an account?
  <a href="/signup" class="text-brand-400 hover:text-brand-300">Create one</a>
</p>
