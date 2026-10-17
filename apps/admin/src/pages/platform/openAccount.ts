import { setActingAccount } from '../../acting';

/** Work inside a landlord account as a platform admin (every admin API call sends X-Account-Id). */
export function openAccount(account: { id: number; name: string }, navigate: (to: string) => void) {
  setActingAccount({ id: account.id, name: account.name });
  navigate('/admin');
}
