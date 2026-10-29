import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AuditEntry,
  DeliveryStats,
  PageOf,
  Paginated,
  PlatformAccount,
  PlatformAccountDetail,
  PlatformAdmin,
  PlatformBillingRun,
  PlatformDelivery,
  PlatformOverview,
  PlatformWhatsAppNumber,
  Role,
  SentResponse,
} from '@rentflow/core';
import { query, type ApiClient } from './client';
import { useApi } from './context';

/** Super admin (platform) API: /api/platform/*. Every write refetches all platform data. */
function usePlatformWrite<TInput, TResult = unknown>(write: (api: ApiClient, input: TInput) => Promise<TResult>) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => write(api, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['platform'] }),
  });
}

export function usePlatformOverview() {
  const api = useApi();
  return useQuery({
    queryKey: ['platform', 'overview'],
    queryFn: () => api.get<{ data: PlatformOverview }>('/api/platform/overview').then((r) => r.data),
  });
}

/* ---------- Landlord accounts ---------- */

export function usePlatformAccounts(filters: { search?: string; status?: string; page?: number } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: ['platform', 'accounts', filters],
    queryFn: () => api.get<PageOf<PlatformAccount>>(`/api/platform/accounts${query(filters)}`),
    placeholderData: keepPreviousData,
  });
}

export function usePlatformAccount(id: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['platform', 'account', id],
    queryFn: () => api.get<{ data: PlatformAccountDetail }>(`/api/platform/accounts/${id}`).then((r) => r.data),
  });
}

export interface CreateAccountBody {
  business_name: string;
  email?: string | null;
  phone?: string | null;
  owner_name: string;
  owner_email: string;
  owner_phone?: string | null;
}

export const useCreateAccount = () => usePlatformWrite((api, body: CreateAccountBody) => api.post('/api/platform/accounts', body));

export interface AccountProfileBody {
  name: string;
  email: string | null;
  phone: string | null;
  timezone: string;
  billing_day: number;
  payment_due_days: number;
  invoice_prefix: string;
}

export const useUpdateAccount = () =>
  usePlatformWrite((api, { id, ...body }: AccountProfileBody & { id: number }) => api.put(`/api/platform/accounts/${id}`, body));

export const useAccountStatus = () =>
  usePlatformWrite((api, { id, ...body }: { id: number; status: 'active' | 'suspended' | 'closed'; reason?: string }) =>
    api.patch(`/api/platform/accounts/${id}/status`, body),
  );

export const useRunAccountBilling = () =>
  usePlatformWrite((api, { id, run_date }: { id: number; run_date?: string }) =>
    api.post(`/api/platform/accounts/${id}/billing-runs`, run_date ? { run_date } : {}),
  );

/* ---------- Billing runs ---------- */

export function usePlatformBillingRuns(filters: { account_id?: number; status?: string; problems?: 1; page?: number } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: ['platform', 'billing-runs', filters],
    queryFn: () => api.get<Paginated<PlatformBillingRun>>(`/api/platform/billing-runs${query(filters)}`),
    placeholderData: keepPreviousData,
  });
}

export function usePlatformBillingRun(id: number | null) {
  const api = useApi();
  return useQuery({
    enabled: id !== null,
    queryKey: ['platform', 'billing-run', id],
    queryFn: () => api.get<{ data: PlatformBillingRun }>(`/api/platform/billing-runs/${id}`).then((r) => r.data),
  });
}

/* ---------- Messaging ---------- */

export function usePlatformDeliveries(filters: { account_id?: number; status?: string; channel?: string; q?: string; page?: number } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: ['platform', 'deliveries', filters],
    queryFn: () => api.get<Paginated<PlatformDelivery>>(`/api/platform/deliveries${query(filters)}`),
    placeholderData: keepPreviousData,
  });
}

export function useDeliveryStats() {
  const api = useApi();
  return useQuery({
    queryKey: ['platform', 'delivery-stats'],
    queryFn: () => api.get<{ data: DeliveryStats }>('/api/platform/deliveries/stats').then((r) => r.data),
  });
}

export const useRetryDelivery = () => usePlatformWrite((api, id: number) => api.post<SentResponse>(`/api/platform/deliveries/${id}/retry`));

export const useRetryFailedDeliveries = () =>
  usePlatformWrite((api, accountId: number | null) =>
    api.post<SentResponse>('/api/platform/deliveries/retry-failed', accountId ? { account_id: accountId } : {}),
  );

export function usePlatformWhatsApp() {
  const api = useApi();
  return useQuery({
    queryKey: ['platform', 'whatsapp'],
    queryFn: () => api.get<{ data: PlatformWhatsAppNumber[] }>('/api/platform/whatsapp-connections').then((r) => r.data),
  });
}

/* ---------- Built-in roles ---------- */

export function useRoleTemplates() {
  const api = useApi();
  return useQuery({
    queryKey: ['platform', 'role-templates'],
    queryFn: () => api.get<{ data: Role[] }>('/api/platform/role-templates').then((r) => r.data),
  });
}

export const useSaveRoleTemplate = () =>
  usePlatformWrite((api, { id, permissions }: { id: number; permissions: string[] }) =>
    api.put(`/api/platform/role-templates/${id}`, { permissions }),
  );

/* ---------- Platform admins ---------- */

export function usePlatformAdmins() {
  const api = useApi();
  return useQuery({
    queryKey: ['platform', 'admins'],
    queryFn: () => api.get<{ data: PlatformAdmin[] }>('/api/platform/admins').then((r) => r.data),
  });
}

export const useInvitePlatformAdmin = () =>
  usePlatformWrite((api, body: { name: string; email: string }) => api.post('/api/platform/admins', body));

export const usePlatformAdminStatus = () =>
  usePlatformWrite((api, { id, status }: { id: number; status: 'active' | 'suspended' }) =>
    api.patch(`/api/platform/admins/${id}/status`, { status }),
  );

export const useResendPlatformAdminInvite = () => usePlatformWrite((api, id: number) => api.post(`/api/platform/admins/${id}/invitation`));

export const useRemovePlatformAdmin = () => usePlatformWrite((api, id: number) => api.delete(`/api/platform/admins/${id}`));

/* ---------- Activity log ---------- */

export function useAuditLog(filters: { account_id?: number; action?: string; q?: string; from?: string; to?: string; page?: number } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: ['platform', 'audit', filters],
    queryFn: () => api.get<Paginated<AuditEntry>>(`/api/platform/audit-log${query(filters)}`),
    placeholderData: keepPreviousData,
  });
}

export function useAuditActions() {
  const api = useApi();
  return useQuery({
    queryKey: ['platform', 'audit-actions'],
    queryFn: () => api.get<{ data: Array<{ action: string; label: string }> }>('/api/platform/audit-log/actions').then((r) => r.data),
  });
}
