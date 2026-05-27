<script lang="ts" module>
  import type { BadgeProps } from './ui/Badge.svelte';

  const TRANSACTION_STATUS_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
    completed:  'success',
    processing: 'info',
    pending:    'warning',
    failed:     'danger',
    reversed:   'danger',
    flagged:    'warning'
  };

  const SUBSCRIPTION_STATUS_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
    active:    'success',
    trialing:  'info',
    past_due:  'warning',
    canceled:  'danger',
    paused:    'neutral',
    unpaid:    'danger'
  };

  const CUSTOMER_STATUS_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
    active:  'success',
    trial:   'info',
    churned: 'danger',
    paused:  'warning',
    blocked: 'danger'
  };

  const INVOICE_STATUS_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
    draft:         'neutral',
    open:          'info',
    paid:          'success',
    void:          'neutral',
    uncollectible: 'danger'
  };

  const FRAUD_SEVERITY_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
    low:      'neutral',
    medium:   'warning',
    high:     'danger',
    critical: 'danger'
  };

  const ROLE_MAP: Record<string, NonNullable<BadgeProps['tone']>> = {
    super_admin:     'brand',
    admin:           'brand',
    finance_manager: 'info',
    ops_manager:     'info',
    analyst:         'neutral',
    viewer:          'neutral'
  };

  export const TONE_MAPS = {
    transaction:  TRANSACTION_STATUS_TONE,
    subscription: SUBSCRIPTION_STATUS_TONE,
    customer:     CUSTOMER_STATUS_TONE,
    invoice:      INVOICE_STATUS_TONE,
    fraud:        FRAUD_SEVERITY_TONE,
    role:         ROLE_MAP
  };
</script>

<script lang="ts">
  import Badge from './ui/Badge.svelte';

  interface Props {
    status: string;
    kind: keyof typeof TONE_MAPS;
  }
  let { status, kind }: Props = $props();

  const tone = $derived(TONE_MAPS[kind][status] ?? 'neutral');
  const label = $derived(status.replace(/_/g, ' '));
</script>

<Badge {tone}>
  <span class="capitalize">{label}</span>
</Badge>
