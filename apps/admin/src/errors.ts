import { ApiError } from '@rentflow/api';

/** Laravel validation errors as { field: first message }, for the components' `error` props. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(Object.keys(error.errors).map((k) => [k, error.field(k) ?? '']));
}

/**
 * The message to show at the top of a form: errors for fields the form doesn't show (`shown`), the
 * API's message when there are no field errors, or a connection problem. null when nothing to say.
 */
export function formMessage(error: unknown, shown: string[] = []): string | null {
  if (!error) return null;
  if (!(error instanceof ApiError)) return "Can't reach the server. Try again.";
  const other = Object.keys(error.errors).filter((k) => !shown.some((s) => k === s || k.startsWith(`${s}.`)));
  if (other.length) return other.map((k) => error.field(k)).join(' ');
  return Object.keys(error.errors).length === 0 ? error.message : null;
}
