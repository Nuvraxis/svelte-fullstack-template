<script lang="ts">
  import { page } from '$app/state';
  import Button from '$lib/components/ui/Button.svelte';
  import { ShieldOff, AlertCircle } from '@lucide/svelte';

  const status = $derived(page.status);
  const message = $derived(page.error?.message ?? 'Something went wrong.');
</script>

<svelte:head><title>{status} · VaultFlow</title></svelte:head>

<main class="grid min-h-screen place-items-center bg-surface-0 px-4">
  <div class="max-w-md text-center">
    <div class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-surface-2">
      {#if status === 403}
        <ShieldOff class="h-6 w-6 text-danger" aria-hidden="true" />
      {:else}
        <AlertCircle class="h-6 w-6 text-warning" aria-hidden="true" />
      {/if}
    </div>
    <h1 class="font-mono text-5xl font-semibold tabular-nums">{status}</h1>
    <p class="mt-3 text-base text-muted">{message}</p>
    <div class="mt-6 flex justify-center gap-2">
      <Button variant="secondary" href="/dashboard">Go to dashboard</Button>
      <Button variant="ghost" href="/login">Sign in</Button>
    </div>
  </div>
</main>
