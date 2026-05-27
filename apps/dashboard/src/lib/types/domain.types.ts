export interface Transaction {
  id: string;
  org_id: string;
  reference: string;
  type: 'payment' | 'refund' | 'payout' | 'transfer' | 'fee' | 'adjustment';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed' | 'flagged';
  amount: number;
  currency: string;
  fee_amount: number;
  net_amount: number;
  customer_id: string | null;
  payment_method: 'card' | 'bank_transfer' | 'crypto' | 'wallet' | null;
  channel: 'web' | 'mobile' | 'api' | 'pos' | null;
  country_code: string | null;
  metadata: Record<string, unknown>;
  flagged_reason: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  org_id: string;
  customer_id: string;
  type: 'card' | 'bank_account' | 'wallet' | 'crypto';
  provider: string | null;
  last_four: string | null;
  expiry_month: number | null;
  expiry_year: number | null;
  fingerprint: string | null;
  is_default: boolean;
  created_at: string;
}

export interface FraudSignal {
  id: string;
  org_id: string;
  transaction_id: string;
  signal_type: 'velocity' | 'geo_mismatch' | 'device_mismatch' | 'amount_anomaly' | 'blacklist';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number | null;
  details: Record<string, unknown>;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  org_id: string;
  external_id: string | null;
  email: string;
  full_name: string;
  company: string | null;
  country_code: string | null;
  ltv: number;
  mrr: number;
  status: 'active' | 'churned' | 'trial' | 'paused' | 'blocked';
  risk_score: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  amount: number;
  currency: string;
  interval: 'monthly' | 'annual';
  trial_days: number;
  features: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  org_id: string;
  customer_id: string;
  plan_id: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  mrr: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  org_id: string;
  customer_id: string;
  subscription_id: string | null;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount_due: number;
  amount_paid: number;
  currency: string;
  due_date: string | null;
  paid_at: string | null;
  line_items: Array<{ description: string; amount: number; quantity: number }>;
  created_at: string;
}

export interface MrrSnapshot {
  id: string;
  org_id: string;
  snapshot_date: string;
  mrr: number;
  new_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churned_mrr: number;
  reactivation_mrr: number;
  total_customers: number;
  active_subscriptions: number;
}

export interface ChurnEvent {
  id: string;
  org_id: string;
  customer_id: string;
  subscription_id: string | null;
  reason: 'price' | 'missing_feature' | 'competitor' | 'budget' | 'no_reason' | string | null;
  mrr_lost: number | null;
  churned_at: string;
}

export interface AuditLogEntry {
  id: string;
  org_id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  org_id: string;
  user_id: string;
  type: 'fraud_alert' | 'payment_failed' | 'churn_risk' | 'invite' | string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  read_at: string | null;
  created_at: string;
}
