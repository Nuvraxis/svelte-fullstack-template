<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { uiStore } from '$lib/stores/ui.store.svelte';

  interface Props {
    children: Snippet;
  }
  let { children }: Props = $props();

  onMount(() => {
    // Sync stored theme to <html> on first mount
    uiStore.setTheme(uiStore.theme);
  });
</script>

<svelte:head>
  <title>VaultFlow</title>
</svelte:head>

{@render children()}
