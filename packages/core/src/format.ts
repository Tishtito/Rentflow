import type { Money } from './types';

const TZ = 'Africa/Nairobi';

/** Money strings from the API → integer cents. Never do arithmetic on floats. */
export function toCents(amount: Money | number | null | undefined): number {
  return Math.round(Number(amount ?? 0) * 100);
}

/** 15000 → "15,000" · 2400.5 → "2,400.50". Pass decimals: 2 for bill totals. */
export function formatAmount(amount: Money | number, opts: { decimals?: 0 | 2 } = {}): string {
  const value = toCents(amount) / 100;
  const decimals = opts.decimals ?? (Number.isInteger(value) ? 0 : 2);
  return value.toLocaleString('en-KE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** "KES 19,500" */
export function formatKES(amount: Money | number, opts: { decimals?: 0 | 2 } = {}): string {
  return `KES ${formatAmount(amount, opts)}`;
}

/** Readings and quantities: "180", "5", "12.5" */
export function formatQuantity(q: Money | number): string {
  const n = Number(q);
  return Number.isInteger(n) ? n.toLocaleString('en-KE') : n.toLocaleString('en-KE', { maximumFractionDigits: 2 });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Day/month/year in Nairobi time for a "YYYY-MM-DD" date or an ISO timestamp. */
function nairobiParts(date: string) {
  const d = new Date(date.length === 10 ? `${date}T00:00:00+03:00` : date);
  const parts = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: TZ }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { day: get('day'), month: get('month'), year: get('year') };
}

/** "16 Oct" · with year: "16 Oct 2026" (always 3-letter months, "Sep" not "Sept") */
export function formatDate(date: string, opts: { year?: boolean } = {}): string {
  const { day, month, year } = nairobiParts(date);
  return `${day} ${MONTHS[month - 1]}${opts.year ? ` ${year}` : ''}`;
}

/** "16 Oct, 06:02" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = formatDate(iso);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
  return `${date}, ${time}`;
}

/** "17 Sep – 15 Oct 2026" */
export function formatPeriod(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end, { year: true })}`;
}

export const channelLabel = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email' } as const;

export const methodLabel = { mpesa: 'M-Pesa', bank: 'Bank', cash: 'Cash', cheque: 'Cheque', other: 'Other' } as const;
