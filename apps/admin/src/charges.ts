import type { ChargeRate } from '@rentflow/core';

/** Current property-wide charges (one per charge_code), from the full rate history. */
export const currentCharges = (rates: ChargeRate[] = []) => rates.filter((r) => r.unit_id === null && r.effective_to === null);

/** Label + unit for a charge code, e.g. electricity → { label: 'Electricity', unit: 'kWh' }. */
export function chargeInfo(rates: ChargeRate[] | undefined, code: string) {
  const r = currentCharges(rates).find((x) => x.charge_code === code);
  return { label: r?.label ?? code.charAt(0).toUpperCase() + code.slice(1), unit: r?.unit_of_measure ?? '' };
}
