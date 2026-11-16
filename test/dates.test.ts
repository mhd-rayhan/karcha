import { formatDisplayDate, parseDate, toIsoDate } from '@/lib/dates';
import { describe, expect, it } from 'vitest';

describe('Dates lib', () => {
  it('parses direct ISO dates', () => {
    expect(toIsoDate('2024-01-15')).toBe('2024-01-15');
    expect(toIsoDate('invalid')).toBe(null);
  });

  it('parses Indian bank date formats', () => {
    expect(parseDate('15/01/2024')).toBe('2024-01-15');
    expect(parseDate('15-01-2024')).toBe('2024-01-15');
    expect(parseDate('15/01/24')).toBe('2024-01-15');
    expect(parseDate('03/10/26')).toBe('2026-10-03');
    expect(parseDate('15-Jan-2024')).toBe('2024-01-15');
    expect(parseDate('05 Oct 2023')).toBe('2023-10-05');
    expect(parseDate('16 Oct 2026')).toBe('2026-10-16');
    expect(parseDate('16-10-2026 11:18:23')).toBe('2026-10-16');
    expect(parseDate('26-03-2026 11:51:34')).toBe('2026-03-26');
  });

  it('formats display dates nicely', () => {
    expect(formatDisplayDate('2024-01-15' as any)).toBe('15 Jan 2024');
    expect(formatDisplayDate('2024-12-31' as any)).toBe('31 Dec 2024');
  });
});
