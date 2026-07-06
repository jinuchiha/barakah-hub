import { describe, it, expect } from 'vitest';
import { toCsv } from '@/lib/csv';

describe('toCsv formula-injection hardening', () => {
  it('neutralizes formula-leading cells with a quote prefix', () => {
    const out = toCsv(['note'], [['=HYPERLINK("http://evil")']]);
    expect(out).toContain(`'=HYPERLINK`);
  });

  it('covers every dangerous prefix', () => {
    for (const p of ['=SUM(A1)', '+1234', '-cmd', '@import', '\tX', '\rX']) {
      const cell = toCsv(['c'], [[p]]).split('\r\n')[1];
      expect(cell.replace(/^"/, '').startsWith("'")).toBe(true);
    }
  });

  it('does not mangle negative numbers', () => {
    const out = toCsv(['amount'], [[-500]]);
    expect(out).toContain('-500');
    expect(out).not.toContain("'-500");
  });

  it('still quotes commas and escapes quotes per RFC 4180', () => {
    const out = toCsv(['a'], [['hello, "world"']]);
    expect(out).toContain('"hello, ""world"""');
  });

  it('renders null/undefined as empty', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]])).toBe('a,b\r\n,\r\n');
  });
});
