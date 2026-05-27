<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLLabelAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn';

  interface Props extends Omit<HTMLLabelAttributes, 'class' | 'children'> {
    class?: string;
    children: Snippet;
  }

  let { class: className, children, ...rest }: Props = $props();
</script>

<label
  class={cn('block text-sm font-medium text-foreground mb-1.5', className)}
  {...rest}
>
  {@render children()}
</label>
