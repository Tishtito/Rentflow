import type { AuthUser, UserRole } from '@rentflow/core';

export const roleLabel: Record<UserRole, string> = {
  super_admin: 'Super admin',
  landlord: 'Landlord',
  caretaker: 'Caretaker',
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** Where a user lands after logging in. */
export const homeFor = (user: AuthUser) => (user.role === 'super_admin' ? '/platform' : '/admin');

/** Caretakers only see these admin sections (their properties' readings and payments). */
export const caretakerPaths = ['/admin', '/admin/readings', '/admin/payments'];
