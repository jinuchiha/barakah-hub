import { describe, it, expect } from 'vitest';
import { cn, ini, normalizePkPhone, pickColor } from '@/lib/utils';

describe('cn', () => {
  it('merges and dedupes Tailwind classes', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
  it('drops falsy values', () => {
    expect(cn('a', false && 'b', null, undefined, 'c')).toBe('a c');
  });
});

describe('ini', () => {
  it('returns first letter of each of the first two words, uppercased', () => {
    expect(ini('Ahmad Baloch')).toBe('AB');
    expect(ini('  ahmad   baloch  ')).toBe('AB');
  });
  it('handles single word', () => {
    expect(ini('Ahmad')).toBe('A');
  });
  it('handles empty / null', () => {
    expect(ini('')).toBe('?');
    expect(ini(null)).toBe('?');
    expect(ini(undefined)).toBe('?');
  });
});

describe('normalizePkPhone', () => {
  it('converts 0xxx-xxxxxxx to 92xxx...', () => {
    expect(normalizePkPhone('0300-1234567')).toBe('923001234567');
  });
  it('adds 92 prefix to 10-digit starting with 3', () => {
    expect(normalizePkPhone('3001234567')).toBe('923001234567');
  });
  it('keeps 12-digit international as-is', () => {
    expect(normalizePkPhone('923001234567')).toBe('923001234567');
  });
  it('strips non-digits', () => {
    expect(normalizePkPhone('  +92 (300) 1234-567 ')).toBe('923001234567');
  });
  it('returns null for too-short numbers', () => {
    expect(normalizePkPhone('123')).toBeNull();
  });
  it('returns null for null/empty', () => {
    expect(normalizePkPhone(null)).toBeNull();
    expect(normalizePkPhone('')).toBeNull();
  });
});

describe('pickColor', () => {
  it('returns a hex color from the palette', () => {
    expect(pickColor('any-seed')).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it('is deterministic for the same seed', () => {
    expect(pickColor('ahmad')).toBe(pickColor('ahmad'));
  });
  it('produces different colors for different seeds', () => {
    // Not strictly guaranteed by hash, but with a 10-color palette
    // and reasonable hashing this should hold for these seeds.
    const a = pickColor('ahmad');
    const b = pickColor('zubaida');
    expect(a !== b || pickColor('ali') !== a).toBe(true);
  });
});
