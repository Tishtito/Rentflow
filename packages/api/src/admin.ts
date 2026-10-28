import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Account,
  AdminTenant,
  AuthUser,
  BillingRun,
  ChargeRate,
  Dashboard,
  Invoice,
  InvoiceListStatus,
  InvoiceSummary,
  MeterReadingEntry,
  MeterReadingTask,
  MeterSetup,
  Paginated,
  Payment,
  PermissionGroup,
  Role,
  SetupProgress,
  TeamMember,
  PaymentMethod,
  Property,
  Unit,
  WhatsAppConnection,
  Wrapped,
} from '@rentflow/core';
import { ApiError, query, type ApiClient } from './client';
import { useApi } from './context';

/** Admin portal (users table, `web` guard): /api/admin/* */

export const adminKeys = {
  user: ['admin', 'user'] as const,
  payments: (filters: object = {}) => ['admin', 'payments', filters] as const,
  invoice: (id: number) => ['admin', 'invoices', id] as const,
  billingRuns: ['admin', 'billing-runs'] as const,
  whatsapp: ['admin', 'whatsapp'] as const,
};

/** Returns null on 404 (e.g. WhatsApp not connected) instead of failing. */
async function orNull<T>(promise: Promise<T>, status: number): Promise<T | null> {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof ApiError && e.status === status) return null;
    throw e;
  }
}

/* ---------- Auth ---------- */

/** The logged-in admin, or null when logged out. */
export function useAdminUser() {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.user,
    queryFn: async () => (await orNull(api.get<{ user: AuthUser }>('/api/admin/user'), 401))?.user ?? null,
    staleTime: Infinity,
    retry: false,
  });
}

/** Password login in the current auth mode: cookie session (web) or API token (apps). */
async function passwordLogin(api: ApiClient, input: { email: string; password: string; remember?: boolean }): Promise<AuthUser> {
  if (api.auth === 'cookie') return (await api.post<{ user: AuthUser }>('/api/admin/auth/login', input)).user;

  // Apps: API token (the web view can't use the API's cookies).
  const r = await api.post<{ user: AuthUser; token: string }>('/api/admin/auth/token', {
    email: input.email,
    password: input.password,
    device_name: 'Rentflow Admin app',
  });
  await api.setToken(r.token);
  return r.user;
}

export function useAdminLogin() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string; remember?: boolean }) => passwordLogin(api, input),
    onSuccess: (user) => qc.setQueryData(adminKeys.user, user),
  });
}

/** "Continue with Google" with the Google ID token: existing logins only. */
export function useAdminGoogleLogin() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { credential: string; remember?: boolean }) => {
      if (api.auth === 'cookie') return (await api.post<{ user: AuthUser }>('/api/admin/auth/google', input)).user;

      const r = await api.post<{ user: AuthUser; token: string }>('/api/admin/auth/google/token', {
        credential: input.credential,
        device_name: 'Rentflow Admin app',
      });
      await api.setToken(r.token);
      return r.user;
    },
    onSuccess: (user) => qc.setQueryData(adminKeys.user, user),
  });
}

export interface RegisterLandlordBody {
  name: string;
  business_name?: string;
  phone: string;
  email: string;
  password: string;
  password_confirmation: string;
}

/** Landlord sign-up (POST /api/admin/auth/register → 202), then logs in with the same email and password. */
export function useRegisterLandlord() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: RegisterLandlordBody) => {
      await api.post<{ message: string }>('/api/admin/auth/register', body);
      return passwordLogin(api, { email: body.email, password: body.password });
    },
    onSuccess: (user) => qc.setQueryData(adminKeys.user, user),
  });
}

export function useAdminLogout() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => (api.auth === 'cookie' ? api.post<void>('/api/admin/auth/logout') : api.delete<void>('/api/admin/auth/token')),
    onSettled: async () => {
      await api.setToken(null);
      qc.clear();
      qc.setQueryData(adminKeys.user, null);
    },
  });
}

/* ---------- Payments ---------- */

export function usePayments(filters: { lease_id?: number | null; page?: number } = {}, options: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({
    enabled: options.enabled ?? true,
    queryKey: adminKeys.payments(filters),
    queryFn: () => api.get<Paginated<Payment>>(`/api/admin/payments${query({ lease_id: filters.lease_id, page: filters.page })}`),
    placeholderData: keepPreviousData,
  });
}

export interface RecordPaymentBody {
  lease_id: number;
  invoice_id?: number | null;
  amount: string;
  method: PaymentMethod;
  reference?: string | null;
  payer_phone?: string | null;
  paid_at: string;
  notes?: string | null;
}

/** POST /api/admin/payments → 202. The payment is applied before the response, so refetch afterwards. */
export function useRecordPayment() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecordPaymentBody) => api.post<{ message: string }>('/api/admin/payments', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'payments'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'invoices'] });
    },
  });
}

/* ---------- Invoices ---------- */

export interface InvoiceFilters {
  search?: string;
  status?: InvoiceListStatus;
  property_id?: number;
  month?: string;
  page?: number;
}

/** The bills list, with totals for the same filters in `meta.summary`. */
export function useInvoices(filters: InvoiceFilters = {}) {
  const api = useApi();
  return useQuery({
    queryKey: ['admin', 'invoices', filters],
    queryFn: () =>
      api.get<Paginated<Invoice> & { meta: Paginated<Invoice>['meta'] & { summary: InvoiceSummary } }>(
        `/api/admin/invoices${query({ ...filters })}`,
      ),
    placeholderData: keepPreviousData,
  });
}

/** Send a bill again (email / WhatsApp; default the tenant's usual channels). */
export const useResendInvoice = () =>
  useAdminWrite((api, { id, channels }: { id: number; channels?: Array<'email' | 'whatsapp'> }) =>
    api.post(`/api/admin/invoices/${id}/resend`, channels ? { channels } : {}),
  );

/** Void a wrong bill (latest bill of its lease, nothing paid yet); the next billing run bills the period again. */
export const useVoidInvoice = () =>
  useAdminWrite((api, { id, reason }: { id: number; reason: string }) => api.post(`/api/admin/invoices/${id}/void`, { reason }));

/** Download a bill's PDF and save it (same file the tenant gets). */
export async function downloadInvoicePdf(api: ApiClient, invoice: Pick<Invoice, 'id' | 'invoice_number'>): Promise<void> {
  const blob = await api.download(`/api/admin/invoices/${invoice.id}/pdf`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoice.invoice_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Download a payment's receipt PDF and save it (same file the tenant gets). */
export async function downloadPaymentReceipt(api: ApiClient, payment: Pick<Payment, 'id' | 'receipt_number'>): Promise<void> {
  const blob = await api.download(`/api/admin/payments/${payment.id}/receipt`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${payment.receipt_number ?? `receipt-${payment.id}`}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function useInvoice(id: number) {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.invoice(id),
    queryFn: () => api.get<Wrapped<Invoice>>(`/api/admin/invoices/${id}`).then((r) => r.data),
    enabled: Number.isInteger(id) && id > 0,
  });
}

/* ---------- Billing runs ---------- */

export function useBillingRuns() {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.billingRuns,
    queryFn: () => api.get<Paginated<BillingRun>>('/api/admin/billing-runs'),
    // Runs are queued: poll while one is still running.
    refetchInterval: (q) => (q.state.data?.data.some((r) => r.status === 'running') ? 3000 : false),
  });
}

/** POST /api/admin/billing-runs → 202; the run happens in the background. */
export function useStartBillingRun() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { run_date?: string } = {}) => api.post<{ message: string }>('/api/admin/billing-runs', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.billingRuns });
      // A queue worker may take a moment to pick the run up.
      setTimeout(() => void qc.invalidateQueries({ queryKey: adminKeys.billingRuns }), 2000);
    },
  });
}

/* ---------- WhatsApp ---------- */

/** The landlord's WhatsApp connection, or null when not connected (404). */
export function useWhatsAppConnection() {
  const api = useApi();
  return useQuery({
    queryKey: adminKeys.whatsapp,
    queryFn: async () => (await orNull(api.get<Wrapped<WhatsAppConnection>>('/api/admin/whatsapp'), 404))?.data ?? null,
  });
}

export interface SaveWhatsAppBody {
  phone_number_id: string;
  business_account_id: string;
  /** Leave out when updating to keep the stored one. */
  access_token?: string;
  app_secret?: string;
  template_name?: string;
  /** The tenant invitation template; empty = rentflow_tenant_invitation. */
  invitation_template_name?: string;
  /** The payment receipt template; empty = rentflow_payment_receipt. */
  receipt_template_name?: string;
  template_language?: string;
}

export function useSaveWhatsApp() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveWhatsAppBody) => api.put<{ message: string }>('/api/admin/whatsapp', body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: adminKeys.whatsapp }),
  });
}

export function useDisconnectWhatsApp() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<{ message: string }>('/api/admin/whatsapp'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: adminKeys.whatsapp }),
  });
}

/* ---------- Shared: writes that change several screens ---------- */

/** After a write: refetch every admin query except "who am I" (lists, dashboard and readings all move together). */
function refreshAdminData(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ['admin'], predicate: (q) => q.queryKey[1] !== 'user' });
}

/** A write, then refetch admin data. `includingMe`: it may change the logged-in user's own roles/permissions. */
function useAdminWrite<TInput>(write: (api: ReturnType<typeof useApi>, input: TInput) => Promise<unknown>, includingMe = false) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => write(api, input),
    onSuccess: () => void (includingMe ? qc.invalidateQueries({ queryKey: ['admin'] }) : refreshAdminData(qc)),
  });
}

/* ---------- Properties, units, meters ---------- */

export function useProperties() {
  const api = useApi();
  return useQuery({
    queryKey: ['admin', 'properties'],
    queryFn: () => api.get<{ data: Property[] }>('/api/admin/properties').then((r) => r.data),
  });
}

export function useProperty(id: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['admin', 'properties', id],
    queryFn: () => api.get<Wrapped<Property>>(`/api/admin/properties/${id}`).then((r) => r.data),
    enabled: id > 0,
  });
}

export function useUnits(propertyId: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['admin', 'units', propertyId],
    queryFn: () => api.get<{ data: Unit[] }>(`/api/admin/properties/${propertyId}/units`).then((r) => r.data),
    enabled: propertyId > 0,
  });
}

export function useCaretakers(options: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: ['admin', 'caretakers'],
    queryFn: () =>
      api
        .get<{ data: Array<{ id: number; name: string; email: string; phone: string | null }> }>('/api/admin/caretakers')
        .then((r) => r.data),
    enabled: options.enabled ?? true,
  });
}

export interface PropertyBody {
  name: string;
  code?: string | null;
  address?: string | null;
  town?: string | null;
  county?: string | null;
  caretaker_id?: number | null;
  status?: 'active' | 'inactive';
  notes?: string | null;
  /** 1–28; null = the account's billing day. */
  billing_day?: number | null;
}

/** Add (no id) or edit a property. */
export const useSaveProperty = () =>
  useAdminWrite((api, { id, ...body }: PropertyBody & { id?: number }) =>
    id ? api.put(`/api/admin/properties/${id}`, body) : api.post('/api/admin/properties', body),
  );

export interface UnitBody {
  unit_number: string;
  type?: string | null;
  bedrooms?: number | null;
  floor?: number | null;
  default_rent: string;
  default_deposit?: string | null;
  status?: 'vacant' | 'reserved' | 'maintenance' | 'occupied';
  notes?: string | null;
  /** 1–28; null = the property's / account's billing day. Omit to leave unchanged. */
  billing_day?: number | null;
  /** Metered utilities: by meter or a fixed amount a month. Omit to leave unchanged. */
  utilities?: Array<{ charge_code: string; billing_type: 'metered' | 'fixed'; amount?: string | null }>;
}

/** Add a unit to a property (no unitId) or edit one. */
export const useSaveUnit = () =>
  useAdminWrite((api, { propertyId, unitId, ...body }: UnitBody & { propertyId: number; unitId?: number }) =>
    unitId ? api.put(`/api/admin/units/${unitId}`, body) : api.post(`/api/admin/properties/${propertyId}/units`, body),
  );

/** Fit a meter (unitId) or replace one (replaceMeterId: same charge, new meter). */
export const useSaveMeter = () =>
  useAdminWrite(
    (
      api,
      input: { unitId: number; replaceMeterId?: number; charge_code?: string; meter_number?: string | null; initial_reading: string },
    ) => {
      const { unitId, replaceMeterId, ...body } = input;
      return replaceMeterId ? api.put(`/api/admin/meters/${replaceMeterId}`, body) : api.post(`/api/admin/units/${unitId}/meters`, body);
    },
  );

/* ---------- Tenants, move-in, move-out ---------- */

export interface MoveInBody {
  tenant: { first_name: string; last_name: string; phone: string; email?: string | null; national_id?: string | null };
  lease: {
    monthly_rent: string;
    deposit_amount?: string;
    start_date: string;
    opening_balance?: string;
    existing?: boolean;
    first_bill_date?: string;
  };
  opening_readings: Record<number, string>;
}

export const useMoveIn = () =>
  useAdminWrite((api, { unitId, ...body }: MoveInBody & { unitId: number }) => api.post(`/api/admin/units/${unitId}/move-in`, body));

export const useEndLease = () =>
  useAdminWrite((api, { leaseId, end_date }: { leaseId: number; end_date: string }) =>
    api.post(`/api/admin/leases/${leaseId}/end`, { end_date }),
  );

export function useTenants(filters: { search?: string; page?: number } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: ['admin', 'tenants', filters],
    queryFn: () => api.get<Paginated<AdminTenant>>(`/api/admin/tenants${query({ search: filters.search, page: filters.page })}`),
    placeholderData: keepPreviousData,
  });
}

export function useTenantDetail(id: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['admin', 'tenants', 'detail', id],
    queryFn: () => api.get<Wrapped<AdminTenant>>(`/api/admin/tenants/${id}`).then((r) => r.data),
    enabled: id > 0,
  });
}

export interface TenantContactBody {
  first_name: string;
  last_name: string;
  phone: string;
  whatsapp_phone?: string | null;
  email?: string | null;
  national_id?: string | null;
  next_of_kin_name?: string | null;
  next_of_kin_phone?: string | null;
}

export const useUpdateTenant = () =>
  useAdminWrite((api, { id, ...body }: TenantContactBody & { id: number }) => api.put(`/api/admin/tenants/${id}`, body));

export const useResendInvitation = () => useAdminWrite((api, tenantId: number) => api.post(`/api/admin/tenants/${tenantId}/invitation`));

/* ---------- Billing settings: charge rates + cycle ---------- */

export function useChargeRates(propertyId: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['admin', 'charge-rates', propertyId],
    queryFn: () => api.get<{ data: ChargeRate[] }>(`/api/admin/properties/${propertyId}/charge-rates`).then((r) => r.data),
    enabled: propertyId > 0,
  });
}

export interface ChargeRateBody {
  charge_code: string;
  label?: string | null;
  billing_type?: 'metered' | 'fixed' | null;
  unit_of_measure?: string | null;
  rate: string;
  effective_from: string;
  unit_id?: number | null;
}

/** New charge, or a new price from a date (never edits an old price). */
export const useChangeChargeRate = () =>
  useAdminWrite((api, { propertyId, ...body }: ChargeRateBody & { propertyId: number }) =>
    api.post(`/api/admin/properties/${propertyId}/charge-rates`, body),
  );

export function useAccount() {
  const api = useApi();
  return useQuery({ queryKey: ['admin', 'account'], queryFn: () => api.get<Wrapped<Account>>('/api/admin/account').then((r) => r.data) });
}

export const useSaveBillingSettings = () =>
  useAdminWrite((api, body: { billing_day: number; payment_due_days: number; invoice_prefix: string }) =>
    api.put('/api/admin/account/billing', body),
  );

/* ---------- Meter readings ---------- */

/** Units whose meters need reading: bills due within `days` (0–31), or 'all' running leases with meters. */
export function useReadingTasks(filters: { property_id?: number | null; days?: number | 'all'; search?: string } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: ['admin', 'readings', filters],
    queryFn: () =>
      api.get<{ data: MeterReadingTask[]; meta: { total: number; done: number } }>(
        `/api/admin/readings${query({ property_id: filters.property_id, days: filters.days, search: filters.search })}`,
      ),
    placeholderData: keepPreviousData,
  });
}

/** One meter's readings, newest first (which bill used each, which can still be corrected). */
export function useMeterReadings(meterId: number | null) {
  const api = useApi();
  return useQuery({
    enabled: meterId !== null,
    queryKey: ['admin', 'meter-readings', meterId],
    queryFn: () => api.get<{ data: MeterReadingEntry[] }>(`/api/admin/meters/${meterId}/readings`).then((r) => r.data),
  });
}

/** Fix a mistyped reading that isn't on a bill yet. */
export const useCorrectReading = () =>
  useAdminWrite((api, { id, reading }: { id: number; reading: string }) => api.put(`/api/admin/meter-readings/${id}`, { reading }));

/** Meter setup grid for a property: every unit × metered charge. */
export function useMeterSetup(propertyId: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['admin', 'meter-setup', propertyId],
    queryFn: () => api.get<{ data: MeterSetup }>(`/api/admin/properties/${propertyId}/meter-setup`).then((r) => r.data),
  });
}

/** Fit many meters on one property at once (all or none; errors as meters.N.field). */
export const useFitMeters = () =>
  useAdminWrite(
    (
      api,
      {
        propertyId,
        meters,
      }: {
        propertyId: number;
        meters: Array<{ unit_id: number; charge_code: string; meter_number?: string | null; initial_reading: string }>;
      },
    ) => api.post(`/api/admin/properties/${propertyId}/meters`, { meters }),
  );

/** The getting-started checklist for a new landlord. */
export function useSetupProgress(options: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({
    enabled: options.enabled ?? true,
    queryKey: ['admin', 'setup'],
    queryFn: () => api.get<{ data: SetupProgress }>('/api/admin/setup').then((r) => r.data),
  });
}

export const useSaveReadings = () =>
  useAdminWrite((api, body: { reading_date?: string; readings: Array<{ meter_id: number; reading: string }> }) =>
    api.post('/api/admin/readings', body),
  );

/* ---------- Dashboard ---------- */

export function useDashboard() {
  const api = useApi();
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.get<Wrapped<Dashboard>>('/api/admin/dashboard').then((r) => r.data),
  });
}

/* ---------- Team & roles ---------- */

export function usePermissionCatalog() {
  const api = useApi();
  return useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => api.get<{ data: PermissionGroup[] }>('/api/admin/permissions').then((r) => r.data),
    staleTime: Infinity,
  });
}

export function useRoles() {
  const api = useApi();
  return useQuery({ queryKey: ['admin', 'roles'], queryFn: () => api.get<{ data: Role[] }>('/api/admin/roles').then((r) => r.data) });
}

/** Create (no id) or edit one of the account's own roles. */
export const useSaveRole = () =>
  useAdminWrite(
    (api, { id, ...body }: { id?: number; name: string; permissions: string[] }) =>
      id ? api.put(`/api/admin/roles/${id}`, body) : api.post('/api/admin/roles', body),
    true,
  );

export const useDeleteRole = () => useAdminWrite((api, id: number) => api.delete(`/api/admin/roles/${id}`));

export function useTeam() {
  const api = useApi();
  return useQuery({ queryKey: ['admin', 'team'], queryFn: () => api.get<{ data: TeamMember[] }>('/api/admin/team').then((r) => r.data) });
}

export interface StaffBody {
  name: string;
  email?: string;
  phone?: string | null;
  role_ids: number[];
  property_ids: number[];
}

/** Invite (no id) or change a team member. */
export const useSaveStaff = () =>
  useAdminWrite(
    (api, { id, ...body }: StaffBody & { id?: number }) =>
      id ? api.put(`/api/admin/team/${id}`, body) : api.post('/api/admin/team', body),
    true,
  );

export const useStaffStatus = () =>
  useAdminWrite((api, { id, status }: { id: number; status: 'active' | 'suspended' }) =>
    api.patch(`/api/admin/team/${id}/status`, { status }),
  );

export const useRemoveStaff = () => useAdminWrite((api, id: number) => api.delete(`/api/admin/team/${id}`));

export const useResendStaffInvite = () => useAdminWrite((api, id: number) => api.post(`/api/admin/team/${id}/invitation`));

/* ---------- Passwords from an emailed link ---------- */

export function useForgotPassword() {
  const api = useApi();
  return useMutation({ mutationFn: (email: string) => api.post<{ message: string }>('/api/admin/auth/forgot-password', { email }) });
}

/** Set the password from an invitation / reset link; logs in (session on the web, token in the apps). */
export function useSetPassword() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; token: string; password: string; password_confirmation: string }) => {
      if (api.auth === 'cookie') return (await api.post<{ user: AuthUser }>('/api/admin/auth/set-password', body)).user;
      const r = await api.post<{ user: AuthUser; token: string }>('/api/admin/auth/set-password', {
        ...body,
        device_name: 'Rentflow Admin app',
      });
      await api.setToken(r.token);
      return r.user;
    },
    onSuccess: (user) => qc.setQueryData(adminKeys.user, user),
  });
}
