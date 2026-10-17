import { describe, expect, it } from 'vitest';
import { belowPrevious, readingErrorsByMeter, readingUsage } from './readings';

describe('readingUsage', () => {
  it('is new − previous × rate (the reference bill: 100 → 180 × 30 = 2,400)', () => {
    expect(readingUsage('100.00', '30.00', '180')).toEqual({ used: 80, amount: 2400 });
    expect(readingUsage('70.00', '170.00', '75.5')).toEqual({ used: 5.5, amount: 935 });
  });

  it('is null when empty, not a number or below the previous reading', () => {
    expect(readingUsage('100.00', '30.00', '')).toBeNull();
    expect(readingUsage('100.00', '30.00', 'abc')).toBeNull();
    expect(readingUsage('100.00', '30.00', '99')).toBeNull();
    expect(belowPrevious('100.00', '99')).toBe(true);
    expect(belowPrevious('100.00', '100')).toBe(false);
  });
});

describe('readingErrorsByMeter', () => {
  it('maps readings.N back to the meters that were sent, in order', () => {
    const errors: Record<string, string> = { 'readings.1.reading': 'Reading 90 is lower than the previous reading 100.' };
    expect(readingErrorsByMeter([7, 9, 11], (k) => errors[k])).toEqual({ 9: 'Reading 90 is lower than the previous reading 100.' });
  });
});
