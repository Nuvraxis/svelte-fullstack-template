import {
  LayoutDashboard,
  ArrowLeftRight,
  ShieldAlert,
  Users,
  Repeat2,
  TrendingUp,
  FileBarChart2,
  UserCog,
  Settings,
  ScrollText,
  CreditCard
} from '@lucide/svelte';
import type { Resource, Action } from '$lib/types/rbac.types';

// Lucide icons are typed as legacy SvelteComponent which doesn't match Svelte 5's
// strict Component<P, E, S> type. We accept any component here since all we do is
// pass it to <Icon /> at the render site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = any;

export interface NavItem {
  label: string;
  href: string;
  icon: IconComponent;
  permission?: { resource: Resource; action: Action };
  badge?: 'count' | 'new' | 'beta';
  group?: string;
  modes?: Array<'fintech' | 'saas' | 'both'>;
}

export const NAV_ITEMS: NavItem[] = [
  // Overview — always visible
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },

  // Fintech group
  {
    group: 'Fintech',
    label: 'Transactions',
    href: '/transactions',
    icon: ArrowLeftRight,
    permission: { resource: 'transactions', action: 'read' },
    modes: ['fintech', 'both']
  },
  {
    group: 'Fintech',
    label: 'Payments',
    href: '/payments',
    icon: CreditCard,
    permission: { resource: 'payments', action: 'read' },
    modes: ['fintech', 'both']
  },
  {
    group: 'Fintech',
    label: 'Fraud Detection',
    href: '/fraud',
    icon: ShieldAlert,
    permission: { resource: 'fraud', action: 'read' },
    modes: ['fintech', 'both']
  },

  // SaaS group
  {
    group: 'SaaS',
    label: 'Customers',
    href: '/customers',
    icon: Users,
    permission: { resource: 'customers', action: 'read' }
  },
  {
    group: 'SaaS',
    label: 'Subscriptions',
    href: '/subscriptions',
    icon: Repeat2,
    permission: { resource: 'subscriptions', action: 'read' },
    modes: ['saas', 'both']
  },
  {
    group: 'SaaS',
    label: 'Revenue',
    href: '/revenue',
    icon: TrendingUp,
    permission: { resource: 'revenue', action: 'read' }
  },

  // Insights group
  {
    group: 'Insights',
    label: 'Reports',
    href: '/reports',
    icon: FileBarChart2,
    permission: { resource: 'reports', action: 'read' }
  },

  // Admin group
  {
    group: 'Admin',
    label: 'Team',
    href: '/team',
    icon: UserCog,
    permission: { resource: 'team', action: 'read' }
  },
  {
    group: 'Admin',
    label: 'Audit Log',
    href: '/audit-log',
    icon: ScrollText,
    permission: { resource: 'audit_log', action: 'read' }
  },
  {
    group: 'Admin',
    label: 'Settings',
    href: '/settings',
    icon: Settings
  }
];

export interface FilteredNavGroup {
  group: string | undefined;
  items: NavItem[];
}

export function filterNav(
  items: NavItem[],
  permissions: Record<string, boolean>,
  mode: 'fintech' | 'saas' | 'both'
): FilteredNavGroup[] {
  const visible = items.filter((item) => {
    if (item.modes && !item.modes.includes(mode) && !item.modes.includes('both')) {
      return false;
    }
    if (item.permission) {
      const key = `${item.permission.resource}:${item.permission.action}`;
      return permissions[key] === true;
    }
    return true;
  });

  const groups = new Map<string | undefined, NavItem[]>();
  for (const item of visible) {
    const existing = groups.get(item.group) ?? [];
    existing.push(item);
    groups.set(item.group, existing);
  }
  return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
}
