import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthUser, BillingRun, Invoice, Paginated, Payment, PaymentMethod, WhatsAppConnection, Wrapped } from '@rentflow/core';
import { ApiError, query } from './client';
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

export function useAdminLogin() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string; remember?: boolean }) => {
      if (api.auth === 'cookie') return (await api.post<{ user: AuthUser }>('/api/admin/auth/login', input)).user;

      // Apps: API token (the web view can't use the API's cookies).
      const r = await api.post<{ user: AuthUser; token: string }>('/api/admin/auth/token', {
        email: input.email,
        password: input.password,
        device_name: 'Rentflow Admin app',
      });
      await api.setToken(r.token);
      return r.user;
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
