import { describe, expect, it } from 'vitest';
import { billingDayChange, effectiveBillingDay, gapRent, moveInRent, nextBillingDateAfter, ordinal } from './billing';

// Same cases as the backend's tests/Unit/BillingCalendarTest.php.
describe('nextBillingDateAfter', () => {
  it.each([
    ['after billing day → next month', '2026-10-20', 5, '2026-11-05'],
    ['on billing day → next month', '2026-10-05', 5, '2026-11-05'],
    ['before billing day → same month', '2026-10-03', 5, '2026-10-05'],
    ['across year end', '2026-12-20', 5, '2027-01-05'],
    ['day 28 in February', '2027-01-31', 28, '2027-02-28'],
  ])('%s', (_, from, day, expected) => {
    expect(nextBillingDateAfter(from as string, day as number)).toBe(expected);
  });

  it('refuses a day that is missing in some months', () => {
    expect(() => nextBillingDateAfter('2026-01-01', 31)).toThrow(RangeError);
  });
});

describe('moveInRent', () => {
  it.each([
    ['20 Oct, rent 15,000 → 16 days → 8,000', '2026-10-20', 5, 15000, 16, 8000],
    ['moving in on the billing day = full month', '2026-10-05', 5, 15000, 30, 15000],
    ['day after billing day in a 31-day month is capped', '2026-08-06', 5, 15000, 30, 15000],
    ['four days', '2026-10-01', 5, 15000, 4, 2000],
    ['rounded to the shilling: 16,900 × 16/30 = 9,013.33', '2026-10-20', 5, 16900, 16, 9013],
    ['February counts 27 days', '2027-02-06', 5, 15000, 27, 13500],
  ])('%s', (_, date, day, rent, days, amount) => {
    const r = moveInRent((rent as number) * 100, date as string, day as number);
    expect(r.days).toBe(days);
    expect(r.amountCents).toBe((amount as number) * 100);
  });

  it('gives the period and the first billing date', () => {
    expect(moveInRent(1_500_000, '2026-10-20', 5)).toMatchObject({
      periodStart: '2026-10-20',
      periodEnd: '2026-11-04',
      firstBillingDate: '2026-11-05',
      fullMonth: false,
    });
  });
});

describe('gapRent', () => {
  it.each([
    ['day 5 → 20: 5–19 Dec = 15 days → 7,500', '2026-12-05', '2026-12-20', 15000, 15, 7500],
    ['one day', '2026-12-05', '2026-12-06', 15000, 1, 500],
    ['day 5 → 4: almost a month, capped at one month', '2026-12-05', '2027-01-04', 15000, 30, 15000],
    ['rounded to the shilling: 16,900 × 15/30 = 8,450', '2026-12-05', '2026-12-20', 16900, 15, 8450],
  ])('%s', (_, from, until, rent, days, amount) => {
    const r = gapRent((rent as number) * 100, from as string, until as string);
    expect(r.days).toBe(days);
    expect(r.amountCents).toBe((amount as number) * 100);
  });

  it('needs at least a day', () => {
    expect(() => gapRent(1_500_000, '2026-12-05', '2026-12-05')).toThrow(RangeError);
  });
});

describe('billing day per property and unit', () => {
  it('uses the unit, then the property, then the account', () => {
    expect(effectiveBillingDay(1, 20, 5)).toBe(1);
    expect(effectiveBillingDay(null, 20, 5)).toBe(20);
    expect(effectiveBillingDay(null, null, 5)).toBe(5);
    expect(effectiveBillingDay(undefined, undefined, undefined)).toBe(5);
  });

  it('moves a let unit to the next new billing day and charges the gap', () => {
    expect(billingDayChange('2026-11-05', 20, 1_500_000)).toEqual({
      nextBillingDate: '2026-11-20',
      gap: { periodStart: '2026-11-05', periodEnd: '2026-11-19', days: 15, amountCents: 750_000 },
    });
    expect(billingDayChange('2026-11-05', 5, 1_500_000)).toEqual({ nextBillingDate: '2026-11-05', gap: null });
  });

  it('writes days as ordinals', () => {
    expect([1, 2, 3, 11, 12, 13, 21, 22, 28].map(ordinal)).toEqual(['1st', '2nd', '3rd', '11th', '12th', '13th', '21st', '22nd', '28th']);
  });
});
