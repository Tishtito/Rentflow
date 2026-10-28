/**
 * Sample data matching the design canvas (House 7-7 is the real paper bill).
 * Replace with API calls (see src/api) — pages only read these through props/hooks.
 */
import type {
  ChargeRate,
  Invoice,
  MeterReadingTask,
  Payment,
  StatementLine,
  Unit,
  UnmatchedMpesaPayment,
} from '@rentflow/core';

export const account = { name: 'Kims Properties Ltd', paybill: '[YOUR PAYBILL]', billingDay: 5 };
export const currentUser = { name: 'Kim Wanjiru', roleLabel: 'Landlord', initials: 'KW' };

export const invoice7_7: Invoice = {
  id: 123,
  invoice_number: 'INV-2026-000123',
  lease_id: 77,
  tenant_id: 7,
  unit_id: 77,
  period_start: '2026-09-17',
  period_end: '2026-10-15',
  issue_date: '2026-10-16',
  due_date: '2026-10-21',
  current_charges: '18500.00',
  balance_brought_forward: '1000.00',
  total_due: '19500.00',
  amount_paid: '0.00',
  balance_remaining: '19500.00',
  status: 'issued',
  tenant: { id: 7, full_name: 'Peter Mwangi', phone: '+254722000481', email: 'peter.mwangi@mail.co.ke' },
  unit: { id: 77, unit_number: '7-7', property_name: 'Kikuyu Court' },
  items: [
    { id: 1, charge_code: 'rent', description: 'Rent', previous_reading: null, current_reading: null, quantity: '1', rate: '15000.00', amount: '15000.00' },
    { id: 2, charge_code: 'electricity', description: 'Electricity', previous_reading: '100', current_reading: '180', quantity: '80', rate: '30.00', amount: '2400.00', unit_of_measure: 'kWh' },
    { id: 3, charge_code: 'water', description: 'Water', previous_reading: '70', current_reading: '75', quantity: '5', rate: '170.00', amount: '850.00', unit_of_measure: 'm³' },
    { id: 4, charge_code: 'garbage', description: 'Garbage collection', previous_reading: null, current_reading: null, quantity: '1', rate: '250.00', amount: '250.00' },
  ],
  deliveries: [
    { id: 1, channel: 'sms', recipient: '+254 722 ••• 481', status: 'delivered', error: null, sent_at: '2026-10-16T06:02:00+03:00' },
    { id: 2, channel: 'whatsapp', recipient: '+254 722 ••• 481', status: 'delivered', error: null, sent_at: '2026-10-16T06:02:00+03:00' },
    { id: 3, channel: 'email', recipient: 'peter.mwangi@mail.co.ke', status: 'sent', error: null, sent_at: '2026-10-16T06:03:00+03:00' },
  ],
};

export const statement7_7: StatementLine[] = [
  { date: '2026-09-17', label: 'INV-…0098', amount: '18120.00' },
  { date: '2026-09-22', label: 'M-Pesa SIK2…', amount: '-17120.00' },
  { date: '2026-10-16', label: 'INV-…0123', amount: '18500.00' },
];

export const payments: Payment[] = [
  { id: 1, lease_id: 73, tenant_id: 3, invoice_id: 119, amount: '18250.00', method: 'mpesa', reference: 'SJF4K2XQ7P', paid_at: '2026-10-15T09:14:00+03:00', receipt_number: 'RCT-2026-000001', balance_after: null, payer_phone: null, notes: null, status: 'confirmed', tenant: { id: 3, full_name: 'Grace Achieng' }, unit_number: '7-3', invoice_number: 'INV-…0119', outcome: { kind: 'paid' } },
  { id: 2, lease_id: 84, tenant_id: 4, invoice_id: 111, amount: '10000.00', method: 'mpesa', reference: 'SJE8R1MN2D', paid_at: '2026-10-14T17:32:00+03:00', receipt_number: 'RCT-2026-000002', balance_after: null, payer_phone: null, notes: null, status: 'confirmed', tenant: { id: 4, full_name: 'Samuel Otieno' }, unit_number: 'B-4', invoice_number: 'INV-…0111', outcome: { kind: 'partial', remaining: '15350.00' } },
  { id: 3, lease_id: 75, tenant_id: 5, invoice_id: 108, amount: '16900.00', method: 'cash', reference: 'receipt 0417', paid_at: '2026-10-13T11:05:00+03:00', receipt_number: 'RCT-2026-000003', balance_after: null, payer_phone: null, notes: null, status: 'confirmed', recorded_by_name: 'Joseph Kariuki', tenant: { id: 5, full_name: 'John Kiprop' }, unit_number: '7-5', invoice_number: 'INV-…0108', outcome: { kind: 'paid' } },
  { id: 4, lease_id: 92, tenant_id: 6, invoice_id: 104, amount: '30000.00', method: 'bank', reference: 'Equity 88213', paid_at: '2026-10-12T10:20:00+03:00', receipt_number: 'RCT-2026-000004', balance_after: null, payer_phone: null, notes: null, status: 'confirmed', tenant: { id: 6, full_name: 'Faith Kamau' }, unit_number: 'S-2', invoice_number: 'INV-…0104', outcome: { kind: 'paid' } },
  { id: 5, lease_id: 76, tenant_id: 8, invoice_id: 99, amount: '10000.00', method: 'mpesa', reference: 'SJB3W9KD5T', paid_at: '2026-10-11T08:47:00+03:00', receipt_number: 'RCT-2026-000005', balance_after: null, payer_phone: null, notes: null, status: 'confirmed', tenant: { id: 8, full_name: 'Lucy Chebet' }, unit_number: '7-6', invoice_number: 'INV-…0099', outcome: { kind: 'credit', credit: '500.00' } },
  { id: 6, lease_id: 72, tenant_id: 2, invoice_id: 95, amount: '8000.00', method: 'mpesa', reference: 'SJA6C0PZ1H', paid_at: '2026-10-10T14:12:00+03:00', receipt_number: null, balance_after: null, payer_phone: null, notes: null, status: 'reversed', tenant: { id: 2, full_name: 'David Kimani' }, unit_number: '7-2', invoice_number: 'INV-…0095' },
];

export const unmatched: UnmatchedMpesaPayment[] = [
  { id: 1, amount: '15000.00', trans_id: 'SJG1T6VB3K', msisdn_masked: '0722 ••• 481', bill_ref: 'seven7', received_at: '2026-10-15T08:41:00+03:00', suggestion: { lease_id: 77, unit_number: '7-7', tenant_name: 'Peter Mwangi', reason: 'same phone' } },
  { id: 2, amount: '12000.00', trans_id: 'SJF7Q2LM8N', msisdn_masked: '0798 ••• 113', bill_ref: 'rent', received_at: '2026-10-14T19:05:00+03:00', suggestion: null },
];

export const chargeRates: ChargeRate[] = [
  { id: 1, property_id: 1, unit_id: null, charge_code: 'electricity', label: 'Electricity', billing_type: 'metered', rate: '30.00', unit_of_measure: 'kWh', effective_from: '2026-01-01', effective_to: null, created_by_name: 'Kim Wanjiru' },
  { id: 2, property_id: 1, unit_id: null, charge_code: 'electricity', label: 'Electricity', billing_type: 'metered', rate: '27.00', unit_of_measure: 'kWh', effective_from: '2025-06-01', effective_to: '2025-12-31', created_by_name: 'Kim Wanjiru' },
  { id: 3, property_id: 1, unit_id: null, charge_code: 'water', label: 'Water', billing_type: 'metered', rate: '170.00', unit_of_measure: 'm³', effective_from: '2026-03-01', effective_to: null, created_by_name: 'Kim Wanjiru' },
  { id: 4, property_id: 1, unit_id: 75, charge_code: 'water', label: 'Water', billing_type: 'metered', rate: '150.00', unit_of_measure: 'm³', effective_from: '2026-03-01', effective_to: null, created_by_name: 'Kim Wanjiru' },
  { id: 5, property_id: 1, unit_id: null, charge_code: 'water', label: 'Water', billing_type: 'metered', rate: '150.00', unit_of_measure: 'm³', effective_from: '2025-06-01', effective_to: '2026-02-28', created_by_name: 'Kim Wanjiru' },
  { id: 6, property_id: 1, unit_id: null, charge_code: 'garbage', label: 'Garbage collection', billing_type: 'fixed', rate: '250.00', unit_of_measure: null, effective_from: '2026-01-01', effective_to: null, created_by_name: 'Kim Wanjiru' },
];

type UnitRow = Unit & { tenant_name: string | null; next_bill: string | null; balance: string | null };

export const units: UnitRow[] = [
  { id: 71, property_id: 1, unit_number: '7-1', type: '1 bedroom', default_rent: '15000.00', status: 'occupied', tenant_name: 'Ann Wairimu', next_bill: '2026-10-22', balance: '0' },
  { id: 72, property_id: 1, unit_number: '7-2', type: '1 bedroom', default_rent: '15000.00', status: 'occupied', tenant_name: 'David Kimani', next_bill: '2026-10-17', balance: '4500' },
  { id: 73, property_id: 1, unit_number: '7-3', type: '1 bedroom', default_rent: '15000.00', status: 'occupied', tenant_name: 'Grace Achieng', next_bill: '2026-10-16', balance: '0' },
  { id: 74, property_id: 1, unit_number: '7-4', type: '1 bedroom', default_rent: '15000.00', status: 'vacant', tenant_name: null, next_bill: null, balance: null },
  { id: 75, property_id: 1, unit_number: '7-5', type: '2 bedroom', default_rent: '16900.00', status: 'occupied', tenant_name: 'John Kiprop', next_bill: '2026-10-24', balance: '0' },
  { id: 76, property_id: 1, unit_number: '7-6', type: 'Bedsitter', default_rent: '9500.00', status: 'occupied', tenant_name: 'Lucy Chebet', next_bill: '2026-10-20', balance: '-500' },
  { id: 77, property_id: 1, unit_number: '7-7', type: '1 bedroom', default_rent: '15000.00', status: 'occupied', tenant_name: 'Peter Mwangi', next_bill: '2026-10-16', balance: '1000' },
  { id: 78, property_id: 1, unit_number: '7-8', type: '2 bedroom', default_rent: '18000.00', status: 'maintenance', tenant_name: null, next_bill: null, balance: null },
];

export const readingTasks: MeterReadingTask[] = [
  {
    unit_id: 77, unit_number: '7-7', tenant_name: 'Peter Mwangi', bills_on: '2026-10-16',
    meters: [
      { meter_id: 1, charge_code: 'electricity', label: 'Electricity', unit_of_measure: 'kWh', rate: '30.00', previous_reading: '100', previous_date: '2026-09-17', current_reading: '180' },
      { meter_id: 2, charge_code: 'water', label: 'Water', unit_of_measure: 'm³', rate: '170.00', previous_reading: '70', previous_date: '2026-09-17', current_reading: null },
    ],
  },
  {
    unit_id: 72, unit_number: '7-2', tenant_name: 'David Kimani', bills_on: '2026-10-17',
    meters: [
      { meter_id: 3, charge_code: 'electricity', label: 'Electricity', unit_of_measure: 'kWh', rate: '30.00', previous_reading: '2210', previous_date: '2026-09-18', current_reading: null },
      { meter_id: 4, charge_code: 'water', label: 'Water', unit_of_measure: 'm³', rate: '170.00', previous_reading: '388', previous_date: '2026-09-18', current_reading: '394' },
    ],
  },
  {
    unit_id: 91, unit_number: '9-1', tenant_name: 'Mary Njeri', bills_on: '2026-10-19',
    meters: [
      { meter_id: 5, charge_code: 'electricity', label: 'Electricity', unit_of_measure: 'kWh', rate: '30.00', previous_reading: '940', previous_date: '2026-09-20', current_reading: null },
      { meter_id: 6, charge_code: 'water', label: 'Water', unit_of_measure: 'm³', rate: '170.00', previous_reading: '122', previous_date: '2026-09-20', current_reading: null },
    ],
  },
];

export const tenantPayments: Payment[] = [
  { id: 11, lease_id: 77, tenant_id: 7, invoice_id: 98, amount: '17120.00', method: 'mpesa', reference: 'SIK2H7LQ1A', paid_at: '2026-09-22T10:00:00+03:00', receipt_number: 'RCT-2026-000011', balance_after: null, payer_phone: null, notes: null, status: 'confirmed' },
  { id: 12, lease_id: 77, tenant_id: 7, invoice_id: 71, amount: '17890.00', method: 'mpesa', reference: 'SHT9P0WE4C', paid_at: '2026-08-20T10:00:00+03:00', receipt_number: 'RCT-2026-000012', balance_after: null, payer_phone: null, notes: null, status: 'confirmed' },
];
