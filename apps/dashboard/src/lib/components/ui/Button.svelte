<script lang="ts" module>
  import { tv, type VariantProps } from 'tailwind-variants';

  export const buttonVariants = tv({
    base: 'inline-flex items-center justify-center gap-2 font-medium text-sm rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap',
    variants: {
      variant: {
        primary:   'bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700',
        secondary: 'bg-surface-3 text-foreground border border-default hover:bg-surface-4',
        ghost:     'text-muted hover:bg-surface-2 hover:text-foreground',
        danger:    'bg-danger text-white hover:opacity-90',
        outline:   'border border-default text-foreground hover:bg-surface-2'
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9 p-0'
      }
    },
    defaultVariants: { variant: 'primary', size: 'md' }
  });

  export type ButtonProps = VariantProps<typeof buttonVariants>;
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes, HTMLAnchorAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn';

  type Props =
    | ({ href: string; variant?: ButtonProps['variant']; size?: ButtonProps['size']; class?: string; children: Snippet } & Omit<HTMLAnchorAttributes, 'class' | 'children'>)
    | ({ href?: undefined; variant?: ButtonProps['variant']; size?: ButtonProps['size']; class?: string; children: Snippet } & Omit<HTMLButtonAttributes, 'class' | 'children'>);

  let { variant, size, class: className, children, href, ...rest }: Props = $props();
</script>

{#if href}
  <a {href} class={cn(buttonVariants({ variant, size }), className)} {...rest as HTMLAnchorAttributes}>
    {@render children()}
  </a>
{:else}
  <button class={cn(buttonVariants({ variant, size }), className)} {...rest as HTMLButtonAttributes}>
    {@render children()}
  </button>
{/if}
