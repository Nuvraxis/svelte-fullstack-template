<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import type { Resource, Action } from '$lib/types/rbac.types';

  interface Props {
    resource: Resource;
    action: Action;
    fallback?: Snippet;
    children: Snippet;
  }

  const { resource, action, fallback, children }: Props = $props();
  const allowed = $derived(
    page.data.permissions?.[`${resource}:${action}`] === true
  );
</script>

{#if allowed}
  {@render children()}
{:else if fallback}
  {@render fallback()}
{/if}
