import { describe, expect, it } from 'vitest';
import { formatAmount, formatDate, formatDateTime, formatKES, formatPeriod, toCents } from './format';

describe('money', () => {
  it('converts decimal strings to integer cents without float drift', () => {
    expect(toCents('0.10') + toCents('0.20')).toBe(30);
    expect(toCents('19500.00')).toBe(1950000);
    expect(toCents(null)).toBe(0);
  });

  it('adds up the reference bill exactly', () => {
    const lines = ['15000.00', '2400.00', '850.00', '250.00'];
    const charges = lines.reduce((sum, l) => sum + toCents(l), 0);
    expect(charges).toBe(toCents('18500.00'));
    expect(charges + toCents('1000.00')).toBe(toCents('19500.00'));
  });

  it('formats KES', () => {
    expect(formatKES('19500.00')).toBe('KES 19,500');
    expect(formatAmount('2400.5')).toBe('2,400.50');
    expect(formatAmount('15000', { decimals: 2 })).toBe('15,000.00');
  });
});

describe('dates (Africa/Nairobi)', () => {
  it('formats dates and periods', () => {
    expect(formatDate('2026-09-30')).toBe('30 Sep');
    expect(formatDate('2026-10-06', { year: true })).toBe('6 Oct 2026');
    expect(formatPeriod('2026-09-01', '2026-09-30')).toBe('1 Sep – 30 Sep 2026');
  });

  it('shows UTC timestamps in Nairobi time', () => {
    // 22:30 UTC is 01:30 the next day in Nairobi (UTC+3).
    expect(formatDateTime('2026-09-30T22:30:00Z')).toBe('1 Oct, 01:30');
  });
});
