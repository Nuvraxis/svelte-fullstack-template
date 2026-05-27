<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn';

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
    class?: string;
    elevated?: boolean;
    children: Snippet;
  }

  let { class: className, elevated, children, ...rest }: Props = $props();
</script>

<div
  class={cn('card', elevated && 'card-elevated', className)}
  {...rest}
>
  {@render children()}
</div>
