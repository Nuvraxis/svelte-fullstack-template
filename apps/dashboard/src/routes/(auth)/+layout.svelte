<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Vault } from '@lucide/svelte';
  import { APP_CONFIG } from '$lib/config/app.config';

  interface Props {
    children: Snippet;
  }
  let { children }: Props = $props();
</script>

<main id="main-content" class="grid min-h-screen w-full place-items-center bg-surface-0 px-4 py-12">
  <div class="w-full max-w-sm">
    <div class="mb-8 flex flex-col items-center">
      <span
        class="mb-3 grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 shadow-elevated"
        aria-hidden="true"
      >
        <Vault class="h-6 w-6 text-white" />
      </span>
      <h1 class="text-2xl font-semibold tracking-tight">{APP_CONFIG.branding.name}</h1>
      <p class="mt-1 text-sm text-muted">Premium fintech &amp; SaaS dashboard</p>
    </div>

    {@render children()}
  </div>
</main>
