import { toCents } from './format';
import type { Money } from './types';

/**
 * Live usage and cost while a reading is typed: new − previous, × rate. null when empty, not a number,
 * or below the previous reading (the API refuses that). Amount in shillings, computed in cents.
 */
export function readingUsage(previous: Money, rate: Money, value: string): { used: number; amount: number } | null {
  if (value.trim() === '') return null;
  const used = (toCents(value) - toCents(previous)) / 100;
  if (Number.isNaN(used) || used < 0) return null;
  return { used, amount: (Math.round(used * 100) * toCents(rate)) / 10_000 };
}

/** The new value is lower than the previous reading (worth a warning before saving). */
export function belowPrevious(previous: Money, value: string): boolean {
  return value.trim() !== '' && !Number.isNaN(Number(value)) && toCents(value) < toCents(previous);
}

/**
 * The API reports errors as `readings.N.reading`, N = position in what was sent. Map them back to meter ids.
 */
export function readingErrorsByMeter(sentMeterIds: number[], field: (key: string) => string | undefined): Record<number, string> {
  const map: Record<number, string> = {};
  sentMeterIds.forEach((id, i) => {
    const msg = field(`readings.${i}.reading`);
    if (msg) map[id] = msg;
  });
  return map;
}
