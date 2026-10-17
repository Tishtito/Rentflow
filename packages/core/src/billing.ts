/**
 * Billing dates and move-in proration: a mirror of the backend's
 * app/Services/Billing/BillingCalendar.php. Change the rules THERE first, then here, and keep
 * billing.test.ts in step with tests/Unit/BillingCalendarTest.php.
 *
 *  - Each landlord bills on one day of the month (accounts.billing_day, 1–28, default 5).
 *  - Move-in rent = monthly rent × days(move-in → next billing day) ÷ 30, rounded to the shilling,
 *    never more than a month; moving in ON the billing day = a full month.
 *
 * Dates are ISO strings (YYYY-MM-DD) handled as calendar days (no time zones involved).
 */
export const DEFAULT_BILLING_DAY = 5;
export const PRORATION_DAYS = 30;

type Ymd = { y: number; m: number; d: number }; // m: 1–12

const parse = (iso: string): Ymd => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { y: y!, m: m!, d: d! };
};
const iso = ({ y, m, d }: Ymd) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const dayNumber = ({ y, m, d }: Ymd) => Date.UTC(y, m - 1, d) / 86_400_000;
const fromDayNumber = (n: number): Ymd => {
  const date = new Date(n * 86_400_000);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
};

export function assertValidBillingDay(day: number): void {
  if (!Number.isInteger(day) || day < 1 || day > 28) throw new RangeError(`Billing day must be between 1 and 28, got ${day}.`);
}

/** First billing date strictly AFTER the date: 20 Oct (day 5) → 5 Nov; 5 Oct → 5 Nov; 3 Oct → 5 Oct. */
export function nextBillingDateAfter(date: string, billingDay: number): string {
  assertValidBillingDay(billingDay);
  const d = parse(date);
  if (billingDay > d.d) return iso({ ...d, d: billingDay });
  return d.m === 12 ? iso({ y: d.y + 1, m: 1, d: billingDay }) : iso({ y: d.y, m: d.m + 1, d: billingDay });
}

/** Whole days from `from` (inclusive) to `to` (exclusive). */
export function daysBetween(from: string, to: string): number {
  return dayNumber(parse(to)) - dayNumber(parse(from));
}

export interface MoveInRent {
  periodStart: string; // move-in date
  periodEnd: string; // day before the first billing date
  days: number; // days charged (30 when moving in on the billing day)
  amountCents: number;
  fullMonth: boolean;
  firstBillingDate: string;
}

/** Rent on the move-in bill, in cents (rounded to the whole shilling). */
export function moveInRent(monthlyRentCents: number, moveInDate: string, billingDay: number): MoveInRent {
  const start = iso(parse(moveInDate));
  const firstBillingDate = nextBillingDateAfter(start, billingDay);
  const periodEnd = iso(fromDayNumber(dayNumber(parse(firstBillingDate)) - 1));

  if (parse(start).d === billingDay) {
    return { periodStart: start, periodEnd, days: PRORATION_DAYS, amountCents: monthlyRentCents, fullMonth: true, firstBillingDate };
  }

  const days = daysBetween(start, firstBillingDate);
  const shillings = Math.round(((monthlyRentCents / 100) * days) / PRORATION_DAYS);
  return {
    periodStart: start,
    periodEnd,
    days,
    amountCents: Math.min(monthlyRentCents, shillings * 100),
    fullMonth: false,
    firstBillingDate,
  };
}
