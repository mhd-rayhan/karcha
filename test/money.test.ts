import { describe, expect, it } from 'vitest';
import { formatPaise, paiseToRupees, toPaise } from '@/lib/money';
import type { Paise } from '@/types/brands';

describe('Money lib (Integer Paise)', () => {
  it('converts numbers and strings to integer paise correctly without float error', () => {
    expect(toPaise(123.45)).toBe(12345);
    expect(toPaise('123.45')).toBe(12345);
    expect(toPaise('1,23,456.78')).toBe(12345678);
    expect(toPaise('₹ 5,000.00')).toBe(500000);
    expect(toPaise('0.10')).toBe(10);
    expect(toPaise('0.20')).toBe(20);
    // 0.1 + 0.2 in float is 0.30000000000000004, but in integer paise:
    const p1 = toPaise('0.10');
    const p2 = toPaise('0.20');
    expect(p1 + p2).toBe(30);
  });

  it('converts paise to rupees decimal', () => {
    expect(paiseToRupees(12345 as Paise)).toBe(123.45);
    expect(paiseToRupees(50000 as Paise)).toBe(500);
  });

  it('formats with Indian Lakh and Crore grouping', () => {
    expect(formatPaise(123456789 as Paise)).toBe('₹12,34,567.89');
    expect(formatPaise(10000000 as Paise)).toBe('₹1,00,000.00');
    expect(formatPaise(50000 as Paise)).toBe('₹500.00');
    expect(formatPaise(99 as Paise)).toBe('₹0.99');
    expect(formatPaise(-150000 as Paise)).toBe('-₹1,500.00');
    expect(formatPaise(150000 as Paise, { showSign: true })).toBe('+₹1,500.00');
    expect(formatPaise(150000 as Paise, { hideCurrency: true })).toBe('1,500.00');
  });
});
