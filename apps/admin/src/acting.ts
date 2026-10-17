import { api, queryClient } from './api';

/**
 * A super admin working inside one landlord account: every admin API call carries X-Account-Id.
 * Remembered for this browser tab only (sessionStorage), so a new tab starts on the platform.
 */
export interface ActingAccount {
  id: number;
  name: string;
}

const KEY = 'rentflow.acting-account';

export function actingAccount(): ActingAccount | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActingAccount) : null;
  } catch {
    return null;
  }
}

export function setActingAccount(account: ActingAccount | null) {
  try {
    if (account) sessionStorage.setItem(KEY, JSON.stringify(account));
    else sessionStorage.removeItem(KEY);
  } catch {
    // storage blocked: works for this page only
  }
  api.setAccountId(account?.id ?? null);
  // Everything cached belongs to the previous account (keep "who am I").
  queryClient.removeQueries({ predicate: (q) => !(q.queryKey[0] === 'admin' && q.queryKey[1] === 'user') });
}

/** Call once at start-up so a reload keeps acting in the same account. */
export function restoreActingAccount() {
  api.setAccountId(actingAccount()?.id ?? null);
}
