import { describe, expect, it } from 'vitest';
import { moveInRent, nextBillingDateAfter } from './billing';

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
