import { describe, expect, it } from 'vitest';
import type { AuthUser } from '@rentflow/core';
import { can } from './access';

const user = (permissions: string[]): AuthUser => ({ id: 1, name: 'X', email: 'x@y.z', role: 'staff', account_id: 1, roles: [], permissions, is_owner: false });

describe('can()', () => {
  it('checks the permission list', () => {
    expect(can(user(['readings.view']), 'readings.view')).toBe(true);
    expect(can(user(['readings.view']), 'payments.record')).toBe(false);
  });

  it('lets super admins do everything and logged-out users nothing', () => {
    expect(can({ ...user(['*']), role: 'super_admin', account_id: null }, 'roles.manage')).toBe(true);
    expect(can(null, 'dashboard.view')).toBe(false);
  });
});
