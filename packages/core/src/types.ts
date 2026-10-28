/**
 * API shapes mirroring the Laravel models (see backend docs/SCHEMA.md).
 * Money arrives as decimal strings ("15000.00"), dates as "YYYY-MM-DD",
 * timestamps as ISO 8601. Keep these in sync with the API Resources.
 */

export type Money = string;
export type ISODate = string;
export type ISODateTime = string;

/** super_admin = platform (no account); staff = works in a landlord account (what they may do comes from their roles). */
export type UserRole = 'super_admin' | 'staff';
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
  /** Day of the month every lease is billed (1–28). */
  billing_day: number;
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

export type PropertyStatus = 'active' | 'inactive';

export interface Property {
  id: number;
  name: string;
  code: string | null;
  address?: string | null;
  town: string | null;
  county: string | null;
  status?: PropertyStatus;
  notes?: string | null;
  caretaker?: Pick<User, 'id' | 'name' | 'phone'> | null;
  units_count?: number;
  occupied_count?: number;
  vacant_count?: number;
  /** What tenants in this property owe (positive lease balances). */
  arrears_total?: Money;
  /** This property's own billing day (1–28); null = the account's. */
  billing_day?: number | null;
  /** The day its units bill on unless they have their own. */
  effective_billing_day?: number;
}

export interface Meter {
  id: number;
  unit_id: number;
  charge_code: string;
  meter_number: string | null;
  initial_reading: Money;
  is_active: boolean;
}

/** The lease on a unit, as listed with the property's units. */
export interface UnitLease {
  id: number;
  tenant_id: number;
  tenant_name: string;
  tenant_status: TenantStatus;
  start_date: ISODate;
  monthly_rent: Money;
  next_billing_date: ISODate;
  status: LeaseStatus;
  /** Running balance: positive = owes, negative = credit. */
  balance: Money | null;
}

export interface Unit {
  id: number;
  property_id: number;
  unit_number: string;
  type: string | null;
  bedrooms?: number | null;
  floor?: number | null;
  default_rent: Money;
  default_deposit?: Money;
  status: UnitStatus;
  notes?: string | null;
  /** This unit's own billing day (1–28); null = its property's / the account's. */
  billing_day?: number | null;
  /** The day it actually bills on. */
  effective_billing_day?: number;
  property?: Pick<Property, 'id' | 'name'>;
  current_lease?: UnitLease | null;
  meters?: Meter[];
  /** How each of the property's metered utilities is billed for this unit (GET properties/{id}/units). */
  utilities?: UnitUtility[];
}

/** A metered utility for one unit: by meter, or a fixed amount a month (no readings). */
export interface UnitUtility {
  charge_code: string;
  label: string;
  unit_of_measure: string | null;
  billing_type: BillingType;
  /** Fixed only: KES a month. */
  amount: Money | null;
  /** Price per unit when billed by meter. */
  metered_rate: Money;
  /** A change waiting for the unit's next bill. */
  pending: { billing_type: BillingType; amount: Money | null; from: string } | null;
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
  unit_number?: string | null;
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
  /** move_in (deposit + prorated rent), monthly (billing day) or adjustment. */
  type?: InvoiceType;
  items?: InvoiceItem[];
  tenant?: Pick<Tenant, 'id' | 'full_name' | 'phone' | 'email'>;
  unit?: Pick<Unit, 'id' | 'unit_number'> & { property_name: string };
  /** Every time the bill was sent (GET /api/admin/invoices/{id}), newest first. */
  deliveries?: NotificationDelivery[];
  sent_at?: ISODateTime | null;
  voided_at?: ISODateTime | null;
  void_reason?: string | null;
  /** Name of who voided it. */
  voided_by?: string | null;
}

/** meta.summary of GET /api/admin/invoices: totals for the filtered bills (void bills add no money). */
export interface InvoiceSummary {
  count: number;
  total_due: Money;
  amount_paid: Money;
  outstanding: Money;
}

export type InvoiceType = 'move_in' | 'monthly' | 'adjustment';

export type InvoiceListStatus = 'unpaid' | InvoiceStatus;

export interface Payment {
  id: number;
  lease_id: number;
  tenant_id: number;
  invoice_id: number | null;
  amount: Money;
  /** Lease balance right after this payment (negative = credit); null on payments from before receipts. */
  balance_after: Money | null;
  method: PaymentMethod;
  reference: string | null;
  /** RCT-2026-000001; null until confirmed. The receipt PDF: GET /api/admin/payments/{id}/receipt. */
  receipt_number: string | null;
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
  property_id?: number;
  property_name?: string;
  lease_id?: number;
  tenant_name: string;
  bills_on: ISODate;
  /** Every meter has a reading for this bill. */
  done?: boolean;
  meters: Array<{
    meter_id: number;
    meter_number?: string | null;
    charge_code: string;
    label: string;
    unit_of_measure: string;
    rate: Money;
    /** The reading the bill counts from (last billed / move-in / initial). */
    previous_reading: Money;
    previous_date: ISODate | null;
    current_reading: Money | null; // null = still to capture
    current_date?: ISODate | null;
  }>;
}

/** GET /api/admin/meters/{id}/readings */
export interface MeterReadingEntry {
  id: number;
  reading_date: ISODate;
  reading: Money;
  is_estimated: boolean;
  recorded_by: string | null;
  /** The bill that used this reading (it can't change any more). */
  invoice: { id: number; invoice_number: string } | null;
  editable: boolean;
}

/** GET /api/admin/properties/{id}/meter-setup */
export interface MeterSetup {
  charges: Array<{ charge_code: string; label: string; unit_of_measure: string | null }>;
  units: Array<{
    unit_id: number;
    unit_number: string;
    status: UnitStatus;
    /** charge_code → fitted meter, or null when still to fit. */
    meters: Record<string, { id: number; meter_number: string | null; initial_reading: Money } | null>;
    /** Charges this unit pays a fixed amount for: no meter needed. */
    fixed: string[];
  }>;
  missing: number;
}

/** GET /api/admin/setup: the getting-started checklist. */
export interface SetupProgress {
  complete: boolean;
  steps: Array<{ key: 'property' | 'prices' | 'units' | 'meters' | 'billing_day' | 'tenants'; title: string; done: boolean; detail: string; link: string }>;
}

export interface NotificationDelivery {
  id: number;
  /** bill_issued (automatic) or bill_resent (sent again by hand). */
  type?: string;
  channel: Channel;
  recipient: string; // masked by the API for phones
  status: DeliveryStatus;
  error: string | null;
  sent_at: ISODateTime | null;
  delivered_at?: ISODateTime | null;
  created_at?: ISODateTime;
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
  /** Role names in the account, e.g. ["Owner"]. */
  roles: string[];
  /** Permission names (see PermissionName); super admins get ["*"]. */
  permissions: string[];
  is_owner: boolean;
}

/** Everything a role can allow (backend App\Enums\Permission). */
export type PermissionName =
  | 'dashboard.view'
  | 'properties.view'
  | 'properties.view_all'
  | 'properties.manage'
  | 'tenants.view'
  | 'tenants.manage'
  | 'leases.manage'
  | 'readings.view'
  | 'readings.record'
  | 'payments.view'
  | 'payments.record'
  | 'invoices.view'
  | 'invoices.manage'
  | 'billing.view'
  | 'billing.run'
  | 'rates.view'
  | 'rates.manage'
  | 'settings.billing'
  | 'whatsapp.manage'
  | 'team.view'
  | 'team.manage'
  | 'roles.manage';

/** GET /api/admin/permissions */
export interface PermissionGroup {
  group: string;
  permissions: Array<{ name: PermissionName; label: string }>;
}

/** GET /api/admin/roles, /api/platform/role-templates */
export interface Role {
  id: number;
  name: string;
  /** Built-in, shared by every account (only super admins change it). */
  is_template: boolean;
  /** Owner: always every permission. */
  is_locked: boolean;
  description: string | null;
  permissions: PermissionName[];
  users_count?: number;
}

/** GET /api/admin/team */
export interface TeamMember {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'invited' | 'suspended';
  last_login_at: ISODateTime | null;
  roles: Array<{ id: number; name: string }>;
  properties: Array<{ id: number; name: string }>;
  is_me: boolean;
}

/** GET /api/platform/accounts */
export interface PlatformAccount {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  status: AccountStatus;
  owner_name: string | null;
  owner_phone: string | null;
  properties_count: number;
  units_count: number;
  team_count: number;
  last_billing_run: { run_date: ISODate; status: BillingRunStatus; invoices_created: number; leases_skipped: number } | null;
  whatsapp_status: WhatsAppStatus | null;
  created_at: ISODateTime;
}

/** GET /api/platform/accounts/{id} */
export interface PlatformAccountDetail {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  status: AccountStatus;
  timezone: string;
  currency: string;
  /** Day of the month every lease is billed (1–28). */
  billing_day: number;
  payment_due_days: number;
  invoice_prefix: string;
  created_at: ISODateTime;
  counts: { properties: number; units: number; occupied_units: number; tenants: number; active_leases: number };
  balance_outstanding: Money;
  team: Array<{ id: number; name: string; email: string; phone: string | null; status: 'active' | 'invited' | 'suspended'; last_login_at: ISODateTime | null; is_owner: boolean }>;
  billing_runs: Array<{ id: number; run_date: ISODate; trigger: 'scheduled' | 'manual'; status: BillingRunStatus; invoices_created: number; leases_skipped: number; finished_at: ISODateTime | null }>;
  deliveries_7d: Array<{ channel: Channel; status: DeliveryStatus; count: number }>;
  whatsapp: { status: WhatsAppStatus; display_phone_number: string | null; verified_name: string | null; verified_at: ISODateTime | null } | null;
  activity: AuditEntry[];
}

/** GET /api/platform/overview */
export interface PlatformOverview {
  accounts: { active: number; suspended: number; closed: number; new_30d: number };
  properties: number;
  units: { total: number; occupied: number; vacant: number };
  tenants: number;
  month: { from: ISODate; bills_count: number; billed: Money; collected: Money };
  balance_outstanding: Money;
  attention: { failed_deliveries_24h: number; failed_deliveries: number; billing_runs_with_problems_7d: number; whatsapp_disabled: number; failed_jobs: number };
  recent_activity: AuditEntry[];
}

/** GET /api/platform/billing-runs */
export interface PlatformBillingRun extends BillingRun {
  account: { id: number; name: string } | null;
  triggered_by: string | null;
  /** Only on GET /api/platform/billing-runs/{id}. */
  skipped?: Array<{ lease_id: number | null; unit: string | null; property: string | null; tenant: string | null; reason: string }>;
}

/** GET /api/platform/deliveries */
export interface PlatformDelivery {
  id: number;
  account: { id: number; name: string } | null;
  tenant: string | null;
  type: string;
  channel: Channel;
  recipient: string;
  status: DeliveryStatus;
  provider: string | null;
  attempts: number;
  error: string | null;
  sent_at: ISODateTime | null;
  delivered_at: ISODateTime | null;
  created_at: ISODateTime;
}

export interface DeliveryStats {
  last_24h: Array<{ channel: Channel; status: DeliveryStatus; count: number }>;
  last_7d: Array<{ channel: Channel; status: DeliveryStatus; count: number }>;
  failed_total: number;
}

/** GET /api/platform/whatsapp-connections (never secrets) */
export interface PlatformWhatsAppNumber {
  account_id: number;
  account_name: string;
  status: WhatsAppStatus;
  display_phone_number: string | null;
  verified_name: string | null;
  template_name: string;
  verified_at: ISODateTime | null;
  updated_at: ISODateTime;
  sent_7d: number;
  failed_7d: number;
}

/** GET /api/platform/admins */
export interface PlatformAdmin {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'invited' | 'suspended';
  last_login_at: ISODateTime | null;
  created_at: ISODateTime;
  is_me: boolean;
}

/** GET /api/platform/audit-log */
export interface AuditEntry {
  id: number;
  created_at: ISODateTime;
  action: string;
  summary: string;
  account: { id: number; name: string } | null;
  actor_type: 'user' | 'tenant' | 'system' | 'guest';
  actor_id: number | null;
  actor_name: string | null;
  via_platform: boolean;
  subject_type: string | null;
  subject_id: number | null;
  data: Record<string, unknown> | null;
  ip: string | null;
}

/** Laravel paginator wrapped as { data, meta } by the platform accounts endpoint. */
export interface PageOf<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
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

/** One home on GET /api/portal/home: a current lease (or the last one after moving out). */
export interface PortalHomeEntry {
  lease_id: number;
  unit_number: string | null;
  property_name: string | null;
  lease_status: LeaseStatus;
  start_date: ISODate;
  monthly_rent: Money;
  next_billing_date: ISODate | null;
  /** Running balance: positive = owes, negative = credit. */
  balance: Money;
  /** With its items; null before the first bill. */
  latest_invoice: Invoice | null;
}

/** A payment as the tenant sees it (no landlord notes). */
export interface TenantPayment {
  id: number;
  lease_id: number;
  invoice_id: number | null;
  amount: Money;
  balance_after: Money | null;
  method: PaymentMethod;
  reference: string | null;
  /** The receipt PDF: GET /api/portal/payments/{id}/receipt. */
  receipt_number: string | null;
  paid_at: ISODateTime;
  invoice_number?: string | null;
}

/** GET /api/portal/home */
export interface PortalHome {
  homes: PortalHomeEntry[];
  recent_payments: TenantPayment[];
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
  /** The tenant invitation template in use (the landlord's own, or rentflow_tenant_invitation). */
  invitation_template_name: string;
  /** The payment receipt template in use (the landlord's own, or rentflow_payment_receipt). */
  receipt_template_name: string;
  template_language: string;
  verified_at: ISODateTime | null;
  /** Paste into Meta: WhatsApp → Configuration → Webhook → Callback URL. */
  webhook_url: string;
  /** Paste into Meta as the webhook's Verify token. */
  webhook_verify_token: string;
}

/** A lease as shown on the tenant pages (with unit and property names). */
export interface TenantLease {
  id: number;
  unit_id: number;
  unit_number: string | null;
  property_id: number | null;
  property_name: string | null;
  start_date: ISODate;
  end_date: ISODate | null;
  monthly_rent: Money;
  deposit_amount: Money;
  next_billing_date: ISODate;
  status: LeaseStatus;
  balance: Money | null;
}

/** A tenant as the landlord sees them: GET /api/admin/tenants[/{id}]. */
export interface AdminTenant {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string;
  whatsapp_phone: string | null;
  national_id: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  /** invited = hasn't set a portal password yet. */
  status: TenantStatus;
  last_login_at: ISODateTime | null;
  current_lease?: TenantLease | null;
  leases?: TenantLease[];
  invoices?: Invoice[];
  payments?: Payment[];
}

/** GET /api/portal/invitations/{token} */
export interface InvitationPreview {
  first_name: string;
  landlord: string | null;
  home: string | null;
  log_in_with: string[];
  expires_at: ISODateTime;
}

/** GET /api/admin/dashboard */
export interface Dashboard {
  today: ISODate;
  cycle: {
    from: ISODate;
    to: ISODate;
    days: number;
    billed: Money;
    bills_count: number;
    collected: Money;
    payments_count: number;
    collection_rate: number | null;
  };
  arrears: { total: Money; leases: number };
  occupancy: { units: number; occupied: number; vacant: number; properties: number };
  attention: {
    missing_readings: { count: number; units: string[] };
    overdue_bills: { count: number; amount: Money };
    failed_messages: number;
  };
  upcoming: Array<{
    lease_id: number;
    unit_id: number;
    unit_number: string;
    property_name: string;
    tenant_id: number;
    tenant_name: string;
    bills_on: ISODate;
    monthly_rent: Money;
    readings: 'ready' | 'missing' | 'no_meters';
  }>;
  by_property: Array<{ property_id: number; name: string; billed: Money; collected: Money }>;
}
