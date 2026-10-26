import { describe, expect, it } from 'vitest';
import { normalizeEmail, normalizePhone } from '../../src/services/identity/normalize';

describe('normalizeEmail', () => {
  it('trims and lowercases so case/space variants match', () => {
    expect(normalizeEmail('Ravi@Gmail.com ')).toBe('ravi@gmail.com');
    expect(normalizeEmail('  RAVI@gmail.COM')).toBe('ravi@gmail.com');
  });
  it('rejects values that are not emails', () => {
    expect(normalizeEmail('ravi')).toBeNull();
    expect(normalizeEmail('ravi@')).toBeNull();
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
  });
});

describe('normalizePhone', () => {
  const ravi = '+919876543210';
  it.each([
    ['9876543210'],
    ['+91 98765 43210'],
    ['+91-98765-43210'],
    ['(+91) 98765 43210'],
    ['098765 43210'],
    ['91 9876543210'],
    ['0091 9876543210'],
  ])('normalises Indian format %s to E.164', (input) => {
    expect(normalizePhone(input, 'IN')).toBe(ravi);
  });
  it('accepts numeric input', () => {
    expect(normalizePhone(9876543210, 'IN')).toBe(ravi);
  });
  it('uses the workspace default country for national numbers', () => {
    expect(normalizePhone('(415) 555-2671', 'US')).toBe('+14155552671');
    expect(normalizePhone('07911 123456', 'GB')).toBe('+447911123456');
  });
  it('keeps explicit international numbers regardless of default country', () => {
    expect(normalizePhone('+44 7911 123456', 'IN')).toBe('+447911123456');
  });
  it('drops extensions', () => {
    expect(normalizePhone('+91 98765 43210 ext. 22', 'IN')).toBe(ravi);
  });
  it('returns null when it cannot be sure', () => {
    expect(normalizePhone('12345', 'IN')).toBeNull();
    expect(normalizePhone('call me', 'IN')).toBeNull();
    expect(normalizePhone('98765 43210', 'ZZ')).toBeNull();
    expect(normalizePhone('+0123456789', 'IN')).toBeNull();
  });
});
