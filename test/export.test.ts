import { describe, expect, it } from 'vitest';
import { sanitizeCsvCell } from '@/lib/export';

describe('Export Library & Formula Injection Neutralisation', () => {
  it('neutralises dangerous spreadsheet formula prefixes (=, +, -, @)', () => {
    expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeCsvCell('+12345')).toBe("'+12345");
    expect(sanitizeCsvCell('-cmd|calc')).toBe("'-cmd|calc");
    expect(sanitizeCsvCell('@IMPORTXML')).toBe("'@IMPORTXML");
  });

  it('keeps normal benign text unchanged', () => {
    expect(sanitizeCsvCell('Swiggy Order 459')).toBe('Swiggy Order 459');
    expect(sanitizeCsvCell(1234.5)).toBe('1234.5');
  });

  it('escapes quotes and commas in CSV cells', () => {
    expect(sanitizeCsvCell('A, B, C')).toBe('"A, B, C"');
    expect(sanitizeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""');
  });
});
