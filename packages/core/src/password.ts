/**
 * Password strength for the sign-up meter: one point each for 8+ characters, an uppercase letter,
 * a digit and a symbol (0–4). Only a hint; the API enforces the real rule (8+ characters).
 */
export function passwordScore(password: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score as 0 | 1 | 2 | 3 | 4;
}

export const passwordScoreLabel = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;
