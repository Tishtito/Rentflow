import { describe, expect, it } from 'vitest';
import { passwordScore } from './password';

describe('passwordScore', () => {
  it('scores length, case, digits and symbols', () => {
    expect(passwordScore('')).toBe(0);
    expect(passwordScore('short')).toBe(0);
    expect(passwordScore('longenough')).toBe(1);
    expect(passwordScore('Longenough')).toBe(2);
    expect(passwordScore('Longenough1')).toBe(3);
    expect(passwordScore('Longenough1!')).toBe(4);
    expect(passwordScore('A1!')).toBe(3); // strong characters but too short
  });
});
