type Currency = string;

const _currencyCache = new Map<string, Intl.NumberFormat>();

export function formatCurrency(
  value: number,
  currency: Currency = 'USD',
  opts: { compact?: boolean; sign?: boolean; locale?: string } = {}
): string {
  const locale = opts.locale ?? 'en-US';
  const key = `${locale}:${currency}:${opts.compact ? 1 : 0}:${opts.sign ? 1 : 0}`;
  let nf = _currencyCache.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: opts.compact ? 'compact' : 'standard',
      signDisplay: opts.sign ? 'exceptZero' : 'auto',
      maximumFractionDigits: opts.compact ? 1 : 2,
      minimumFractionDigits: opts.compact ? 0 : 2
    });
    _currencyCache.set(key, nf);
  }
  return nf.format(value);
}

export function formatNumber(
  value: number,
  opts: { compact?: boolean; decimals?: number } = {}
): string {
  return new Intl.NumberFormat('en-US', {
    notation: opts.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts.decimals ?? (opts.compact ? 1 : 0)
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatDate(value: string | Date, format: 'short' | 'long' | 'time' = 'short'): string {
  const d = value instanceof Date ? value : new Date(value);
  if (format === 'short') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (format === 'time') {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
  return d.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

const RELATIVE = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1]
];

export function formatRelativeDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  const diff = (d.getTime() - Date.now()) / 1000;
  for (const [unit, seconds] of UNITS) {
    if (Math.abs(diff) >= seconds || unit === 'second') {
      return RELATIVE.format(Math.round(diff / seconds), unit);
    }
  }
  return RELATIVE.format(0, 'second');
}

export function trendDirection(delta: number): 'up' | 'down' | 'flat' {
  if (delta > 0.001) return 'up';
  if (delta < -0.001) return 'down';
  return 'flat';
}

export function maskAccountNumber(last4: string | null | undefined): string {
  if (!last4) return '••••';
  return `•••• ${last4}`;
}

export function shortId(id: string, length = 8): string {
  return id.replace(/-/g, '').slice(0, length).toUpperCase();
}
