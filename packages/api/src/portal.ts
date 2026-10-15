import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PortalLoginResult, PortalTenant } from '@rentflow/core';
import { ApiError } from './client';
import { useApi } from './context';

/** Tenant portal (tenants table, `tenant` guard): /api/portal/* */

export const portalKeys = {
  tenant: ['portal', 'tenant'] as const,
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
