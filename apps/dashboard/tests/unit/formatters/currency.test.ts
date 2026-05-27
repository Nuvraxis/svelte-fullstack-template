import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  trendDirection,
  shortId
} from '$lib/utils/formatters';

describe('formatCurrency', () => {
  it('formats USD with 2 decimals by default', () => {
    expect(formatCurrency(1234567.89, 'USD')).toMatch(/\$1,234,567\.89/);
  });

  it('formats EUR', () => {
    expect(formatCurrency(1000, 'EUR')).toMatch(/€1,000\.00/);
  });

  it('formats compact', () => {
    expect(formatCurrency(1_500_000, 'USD', { compact: true })).toMatch(/\$1\.5M/);
  });

  it('includes sign for positive when sign:true', () => {
    expect(formatCurrency(50, 'USD', { sign: true })).toMatch(/^\+/);
  });
});

describe('formatNumber', () => {
  it('formats integers with commas', () => {
    expect(formatNumber(2_500_000)).toBe('2,500,000');
  });
  it('compact form', () => {
    expect(formatNumber(2500, { compact: true })).toBe('2.5K');
  });
});

describe('formatPercent', () => {
  it('prefixes positive with +', () => {
    expect(formatPercent(12.4)).toBe('+12.4%');
  });
  it('keeps negative sign', () => {
    expect(formatPercent(-3.7)).toBe('-3.7%');
  });
});

describe('trendDirection', () => {
  it('up for positive delta', () => {
    expect(trendDirection(0.05)).toBe('up');
  });
  it('down for negative delta', () => {
    expect(trendDirection(-0.05)).toBe('down');
  });
  it('flat for near-zero', () => {
    expect(trendDirection(0)).toBe('flat');
    expect(trendDirection(0.0005)).toBe('flat');
  });
});

describe('shortId', () => {
  it('strips dashes and uppercases', () => {
    expect(shortId('abc-def-1234-5678-9012')).toBe('ABCDEF12');
  });
});
