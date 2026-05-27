<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn';

  interface Props extends Omit<HTMLInputAttributes, 'class' | 'value'> {
    class?: string;
    invalid?: boolean;
    value?: HTMLInputAttributes['value'];
  }

  let {
    class: className,
    invalid,
    value = $bindable(),
    ...rest
  }: Props = $props();
</script>

<input
  bind:value
  class={cn(
    'input-base w-full',
    invalid && 'border-danger focus:border-danger',
    className
  )}
  aria-invalid={invalid || undefined}
  {...rest}
/>
