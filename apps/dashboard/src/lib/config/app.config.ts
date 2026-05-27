import { env } from '$env/dynamic/public';

export type AppMode = 'fintech' | 'saas' | 'both';

export interface AppConfig {
  mode: AppMode;
  name: string;
  currency: string;
  timezone: string;
  features: {
    transactions: boolean;
    fraud: boolean;
    payments: boolean;
    customers: boolean;
    subscriptions: boolean;
    revenue: boolean;
    reports: boolean;
    realtime: boolean;
    exports: boolean;
  };
  branding: {
    name: string;
    logo: string;
    primaryColor: string;
  };
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

export function getAppConfig(orgMode?: AppMode): AppConfig {
  const mode = (env.PUBLIC_APP_MODE as AppMode) ?? orgMode ?? 'both';
  const name = env.PUBLIC_APP_NAME ?? 'VaultFlow';

  return {
    mode,
    name,
    currency: env.PUBLIC_DEFAULT_CURRENCY ?? 'USD',
    timezone: env.PUBLIC_DEFAULT_TIMEZONE ?? 'UTC',
    features: {
      transactions: mode === 'fintech' || mode === 'both',
      fraud:        mode === 'fintech' || mode === 'both',
      payments:     mode === 'fintech' || mode === 'both',
      customers:    true,
      subscriptions: mode === 'saas' || mode === 'both',
      revenue:      true,
      reports:      bool(env.PUBLIC_FEATURE_REPORTS, true),
      realtime:     bool(env.PUBLIC_FEATURE_REALTIME, true),
      exports:      bool(env.PUBLIC_FEATURE_EXPORTS, true)
    },
    branding: {
      name,
      logo: '/images/logo.svg',
      primaryColor: '#6366f1'
    }
  };
}

export const APP_CONFIG = getAppConfig();
