<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import { uiStore } from '$lib/stores/ui.store.svelte';

  const themes = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'system', label: 'System' }
  ] as const;
</script>

<svelte:head><title>Appearance · VaultFlow</title></svelte:head>

<Card class="p-6">
  <h2 class="mb-1 text-lg font-semibold">Appearance</h2>
  <p class="mb-5 text-sm text-muted">Pick a theme. System follows your OS preference.</p>

  <fieldset class="space-y-2">
    <legend class="sr-only">Theme</legend>
    {#each themes as t (t.value)}
      <label
        class="flex cursor-pointer items-center gap-3 rounded-md border border-default bg-surface-2 px-4 py-3 transition-colors hover:bg-surface-3 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-600/10"
      >
        <input
          type="radio"
          name="theme"
          value={t.value}
          checked={uiStore.theme === t.value}
          onchange={() => uiStore.setTheme(t.value)}
          class="h-4 w-4 accent-brand-500"
        />
        <span class="text-sm">{t.label}</span>
      </label>
    {/each}
  </fieldset>
</Card>
