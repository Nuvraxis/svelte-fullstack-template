<script lang="ts" module>
  import { tv, type VariantProps } from 'tailwind-variants';

  export const badgeVariants = tv({
    base: 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums',
    variants: {
      tone: {
        neutral: 'bg-surface-3 text-foreground border border-default',
        success: 'bg-[var(--color-success-bg)] text-success',
        warning: 'bg-[var(--color-warning-bg)] text-warning',
        danger:  'bg-[var(--color-danger-bg)] text-danger',
        info:    'bg-[var(--color-info-bg)] text-info',
        brand:   'bg-brand-600/15 text-brand-300'
      }
    },
    defaultVariants: { tone: 'neutral' }
  });
  export type BadgeProps = VariantProps<typeof badgeVariants>;
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    tone?: BadgeProps['tone'];
    class?: string;
    children: Snippet;
  }
  let { tone = 'neutral', class: className, children }: Props = $props();
</script>

<span class={cn(badgeVariants({ tone }), className)}>
  {@render children()}
</span>
