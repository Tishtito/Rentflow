import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Invoice, InvitationPreview, Paginated, PortalHome, PortalLoginResult, PortalTenant, TenantPayment, Wrapped } from '@rentflow/core';
import { ApiError, query, type ApiClient } from './client';
import { useApi } from './context';

/** Tenant portal (tenants table, `tenant` guard): /api/portal/* */

export const portalKeys = {
  tenant: ['portal', 'tenant'] as const,
  home: ['portal', 'home'] as const,
  invoices: (page: number) => ['portal', 'invoices', page] as const,
  invoice: (id: number) => ['portal', 'invoice', id] as const,
  payments: (page: number) => ['portal', 'payments', page] as const,
};

/** The logged-in tenant, or null when logged out. */
export function useTenant() {
  const api = useApi();
  return useQuery({
    queryKey: portalKeys.tenant,
    queryFn: async () => {
      try {
        return (await api.get<{ tenant: PortalTenant }>('/api/portal/user')).tenant;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: Infinity,
    retry: false,
  });
}

/**
 * Log in with email or national ID. If the person rents from several landlords the result is
 * `{ choose_home: true, homes }`: ask which one and call again with its `tenant_id`.
 */
export function useTenantLogin() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { identifier: string; password: string; tenant_id?: number; remember?: boolean }) => {
      if (api.auth === 'cookie') return api.post<PortalLoginResult>('/api/portal/auth/login', input);

      // Apps: API token (the web view can't use the API's cookies).
      const result = await api.post<PortalLoginResult & { token?: string }>('/api/portal/auth/token', {
        identifier: input.identifier,
        password: input.password,
        tenant_id: input.tenant_id,
        device_name: 'Rentflow app',
      });
      if (result.token) await api.setToken(result.token);
      return result;
    },
    onSuccess: (result) => {
      if (!result.choose_home) qc.setQueryData(portalKeys.tenant, result.tenant);
    },
  });
}

/**
 * "Continue with Google" with the Google ID token (activated tenants only). Same `choose_home` step as
 * the password login: call again with `tenant_id`.
 */
export function useTenantGoogleLogin() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { credential: string; tenant_id?: number; remember?: boolean }) => {
      if (api.auth === 'cookie') return api.post<PortalLoginResult>('/api/portal/auth/google', input);

      const result = await api.post<PortalLoginResult & { token?: string }>('/api/portal/auth/google/token', {
        credential: input.credential,
        tenant_id: input.tenant_id,
        device_name: 'Rentflow app',
      });
      if (result.token) await api.setToken(result.token);
      return result;
    },
    onSuccess: (result) => {
      if (!result.choose_home) qc.setQueryData(portalKeys.tenant, result.tenant);
    },
  });
}

export function useTenantLogout() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => (api.auth === 'cookie' ? api.post<void>('/api/portal/auth/logout') : api.delete<void>('/api/portal/auth/token')),
    onSettled: async () => {
      await api.setToken(null);
      qc.clear();
      qc.setQueryData(portalKeys.tenant, null);
    },
  });
}

/* ---------- Invitation link (/invite/:token) ---------- */

/** Who the invitation is for; `null` when the link is invalid, used or expired (404). */
export function useInvitation(token: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['portal', 'invitation', token],
    queryFn: async () => {
      try {
        return await api.get<InvitationPreview>(`/api/portal/invitations/${encodeURIComponent(token)}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    retry: false,
    enabled: token.length > 0,
  });
}

/** Set the password from the invitation; logs the tenant in (session on the web, token in the apps). */
export function useAcceptInvitation(token: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { password: string; password_confirmation: string }) => {
      const url = `/api/portal/invitations/${encodeURIComponent(token)}`;
      if (api.auth === 'cookie') return (await api.post<{ tenant: PortalTenant }>(url, body)).tenant;

      const r = await api.post<{ tenant: PortalTenant; token: string }>(url, { ...body, device_name: 'Rentflow app' });
      await api.setToken(r.token);
      return r.tenant;
    },
    onSuccess: (tenant) => qc.setQueryData(portalKeys.tenant, tenant),
  });
}

/* ---------- After login: home, bills, payments (the tenant's own only) ---------- */

/** Home screen: each current home with its balance and latest bill, plus the last 5 payments. */
export function usePortalHome() {
  const api = useApi();
  return useQuery({ queryKey: portalKeys.home, queryFn: () => api.get<PortalHome>('/api/portal/home') });
}

/** My bills, newest first (15 per page; void bills left out). */
export function usePortalInvoices(page = 1) {
  const api = useApi();
  return useQuery({
    queryKey: portalKeys.invoices(page),
    queryFn: () => api.get<Paginated<Invoice>>(`/api/portal/invoices${query({ page })}`),
    placeholderData: keepPreviousData,
  });
}

/** One of my bills with its lines; 404 (ApiError) when it isn't mine. */
export function usePortalInvoice(id: number) {
  const api = useApi();
  return useQuery({
    queryKey: portalKeys.invoice(id),
    queryFn: () => api.get<Wrapped<Invoice>>(`/api/portal/invoices/${id}`).then((r) => r.data),
    enabled: Number.isInteger(id) && id > 0,
  });
}

/** My confirmed payments, newest first (20 per page). */
export function usePortalPayments(page = 1) {
  const api = useApi();
  return useQuery({
    queryKey: portalKeys.payments(page),
    queryFn: () => api.get<Paginated<TenantPayment>>(`/api/portal/payments${query({ page })}`),
    placeholderData: keepPreviousData,
  });
}

/** Save one of my bills as a PDF (works with the cookie session and with the app's token). */
export async function downloadPortalInvoicePdf(api: ApiClient, invoice: Pick<Invoice, 'id' | 'invoice_number'>): Promise<void> {
  const blob = await api.download(`/api/portal/invoices/${invoice.id}/pdf`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoice.invoice_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
