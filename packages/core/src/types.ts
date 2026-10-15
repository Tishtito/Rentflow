/**
 * API shapes mirroring the Laravel models (see backend docs/SCHEMA.md).
 * Money arrives as decimal strings ("15000.00"), dates as "YYYY-MM-DD",
 * timestamps as ISO 8601. Keep these in sync with the API Resources.
 */

export type Money = string;
export type ISODate = string;
export type ISODateTime = string;

export type UserRole = 'super_admin' | 'landlord' | 'caretaker';
export type UnitStatus = 'vacant' | 'occupied' | 'reserved' | 'maintenance';
export type TenantStatus = 'invited' | 'active' | 'inactive';
export type LeaseStatus = 'active' | 'notice' | 'ended';
export type BillingType = 'metered' | 'fixed';
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'void';
export type PaymentMethod = 'mpesa' | 'bank' | 'cash' | 'cheque' | 'other';
export type PaymentStatus = 'pending' | 'confirmed' | 'reversed';
export type Channel = 'email' | 'sms' | 'whatsapp';
export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed';
export type AccountStatus = 'active' | 'suspended' | 'closed';

export interface Account {
  id: number;
  name: string;
  slug: string;
  currency: string;
  billing_cycle_days: number;
  payment_due_days: number;
  invoice_prefix: string;
  status: AccountStatus;
}

export interface User {
  id: number;
  account_id: number | null;
  role: UserRole;
  name: string;
  email: string;
  phone: string | null;
}

export interface Property {
  id: number;
  name: string;
  code: string | null;
  town: string | null;
  county: string | null;
  caretaker?: Pick<User, 'id' | 'name' | 'phone'> | null;
  units_count?: number;
}

export interface Unit {
  id: number;
  property_id: number;
  unit_number: string;
  type: string | null;
  default_rent: Money;
  status: UnitStatus;
  property?: Pick<Property, 'id' | 'name'>;
  current_lease?: Lease | null;
}

export interface Tenant {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  national_id: string | null;
  phone: string;
  status: TenantStatus;
  notification_channels: Channel[] | null;
}

export interface Lease {
  id: number;
  unit_id: number;
  tenant_id: number;
  start_date: ISODate;
  end_date: ISODate | null;
  monthly_rent: Money;
  deposit_amount: Money;
  next_billing_date: ISODate;
  status: LeaseStatus;
  /** Running balance: positive = owes, negative = credit. */
  balance?: Money;
  tenant?: Tenant;
  unit?: Unit;
}

export interface ChargeRate {
  id: number;
  property_id: number;
  unit_id: number | null; // null = property-wide
  charge_code: string; // electricity | water | garbage | ...
  label: string;
  billing_type: BillingType;
  rate: Money;
  unit_of_measure: string | null; // kWh, m³
  effective_from: ISODate;
  effective_to: ISODate | null; // null = current
  created_by_name?: string | null;
}

export interface InvoiceItem {
  /** Not sent by the API (items are snapshots of the bill); present in fixtures only. */
  id?: number;
  charge_code: string;
  description: string;
  previous_reading: Money | null;
  current_reading: Money | null;
  quantity: Money;
  rate: Money;
  amount: Money;
  unit_of_measure?: string | null;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  lease_id: number;
  tenant_id: number;
  unit_id: number;
  period_start: ISODate;
  period_end: ISODate;
  issue_date: ISODate;
  due_date: ISODate;
  current_charges: Money;
  balance_brought_forward: Money;
  total_due: Money;
  amount_paid: Money;
  /** What is still owed on this bill after payments. */
  balance_remaining: Money;
  status: InvoiceStatus;
  items?: InvoiceItem[];
  tenant?: Pick<Tenant, 'id' | 'full_name' | 'phone' | 'email'>;
  unit?: Pick<Unit, 'id' | 'unit_number'> & { property_name: string };
  deliveries?: NotificationDelivery[];
}

export interface Payment {
  id: number;
  lease_id: number;
  tenant_id: number;
  invoice_id: number | null;
  amount: Money;
  method: PaymentMethod;
  reference: string | null;
  payer_phone: string | null;
  paid_at: ISODateTime;
  status: PaymentStatus;
  notes: string | null;
  recorded_by_name?: string | null;
  tenant?: Pick<Tenant, 'id' | 'full_name'>;
  unit_number?: string;
  invoice_number?: string | null;
  /** Bill outcome after this payment, computed by the API. */
  outcome?: { kind: 'paid' | 'partial' | 'credit'; remaining?: Money; credit?: Money };
}

/** M-Pesa payment that arrived with an account number that matched no unit (planned mpesa_transactions table). */
export interface UnmatchedMpesaPayment {
  id: number;
  amount: Money;
  trans_id: string;
  msisdn_masked: string;
  bill_ref: string; // what the payer typed as account number
  received_at: ISODateTime;
  suggestion?: { lease_id: number; unit_number: string; tenant_name: string; reason: string } | null;
}

export interface MeterReadingTask {
  unit_id: number;
  unit_number: string;
  tenant_name: string;
  bills_on: ISODate;
  meters: Array<{
    meter_id: number;
    charge_code: string;
    label: string;
    unit_of_measure: string;
    rate: Money;
    previous_reading: Money;
    previous_date: ISODate;
    current_reading: Money | null; // null = still to capture
  }>;
}

export interface NotificationDelivery {
  id: number;
  channel: Channel;
  recipient: string; // masked by the API for phones
  status: DeliveryStatus;
  error: string | null;
  sent_at: ISODateTime | null;
}

export interface StatementLine {
  date: ISODate;
  label: string; // "INV-…0123" or "M-Pesa SIK2…"
  amount: Money; // + charge, − payment
}

/** Laravel paginator envelope (API Resource collections). */
export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null };
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
}

/** `{ data: T }` wrapper of a single API Resource. */
export interface Wrapped<T> {
  data: T;
}

/** Admin-portal login (users table): GET /api/admin/user, POST /api/admin/auth/login. */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  account_id: number | null;
}

/** Tenant-portal login (tenants table): GET /api/portal/user, POST /api/portal/auth/login. */
export interface PortalTenant {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string;
  account: { id: number; name: string | null };
}

/** POST /api/portal/auth/login: logged in, or several landlords matched and the person must choose. */
export type PortalLoginResult =
  | { choose_home: false; tenant: PortalTenant }
  | { choose_home: true; homes: Array<{ tenant_id: number; account_name: string | null }> };

export type BillingRunStatus = 'running' | 'completed' | 'completed_with_errors' | 'failed';

export interface BillingRun {
  id: number;
  run_date: ISODate;
  trigger: 'scheduled' | 'manual';
  status: BillingRunStatus;
  invoices_created: number;
  leases_skipped: number;
  /** Leases skipped and why (e.g. a missing meter reading). */
  errors: Array<{ lease_id: number; unit_id: number; reason: string }>;
  started_at: ISODateTime | null;
  finished_at: ISODateTime | null;
}

export type WhatsAppStatus = 'active' | 'disabled';

export interface WhatsAppConnection {
  status: WhatsAppStatus;
  phone_number_id: string;
  business_account_id: string;
  display_phone_number: string | null;
  verified_name: string | null;
  template_name: string;
  template_language: string;
  verified_at: ISODateTime | null;
  /** Paste into Meta: WhatsApp → Configuration → Webhook → Callback URL. */
  webhook_url: string;
  /** Paste into Meta as the webhook's Verify token. */
  webhook_verify_token: string;
}
