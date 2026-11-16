import type { IsoDate } from '@/types/brands';

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

/**
 * Validates and converts YYYY-MM-DD into a branded IsoDate
 */
export function toIsoDate(str: string): IsoDate | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [, m, d] = str.split('-').map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return str as IsoDate;
    }
  }
  return null;
}

/**
 * Parses raw bank date string using heuristics and candidate formats.
 */
export function parseDate(raw: string, defaultYear?: number): IsoDate | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/,/g, '');

  // Strip trailing time e.g. " 11:18:23", "T11:18:23", " 11:18 AM"
  const withoutTime = clean
    .replace(/(?:[T\s]\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?).*$/, '')
    .trim();

  // 1. Direct YYYY-MM-DD
  const directIso = toIsoDate(withoutTime);
  if (directIso) return directIso;

  // 2. DD/MM/YYYY or DD/MM/YY or DD-MM-YYYY or DD-MM-YY
  const numMatch = withoutTime.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (numMatch) {
    const day = numMatch[1].padStart(2, '0');
    const month = numMatch[2].padStart(2, '0');
    let year = Number.parseInt(numMatch[3], 10);
    if (year < 100) {
      // 2-digit year conversion: >= 70 is 1900s, < 70 is 2000s
      year = year < 70 ? 2000 + year : 1900 + year;
    }
    return toIsoDate(`${year}-${month}-${day}`);
  }

  // 3. DD-MMM-YYYY or DD-MMM-YY or DD MMM YYYY or DD-Month-YYYY
  const alphaMatch = withoutTime.match(/^(\d{1,2})[\s\-/]+([A-Za-z]{3,9})[\s\-/]+(\d{2,4})$/);
  if (alphaMatch) {
    const day = alphaMatch[1].padStart(2, '0');
    const monthKey = alphaMatch[2].slice(0, 3).toLowerCase();
    const month = MONTH_MAP[monthKey];
    if (!month) return null;

    let year = Number.parseInt(alphaMatch[3], 10);
    if (year < 100) {
      year = year < 70 ? 2000 + year : 1900 + year;
    }
    return toIsoDate(`${year}-${month}-${day}`);
  }

  // 4. Yearless date: DD/MM or DD-MMM (uses defaultYear or current year)
  const yearlessMatch = withoutTime.match(/^(\d{1,2})[/\-.]([A-Za-z]{3,9}|\d{1,2})$/);
  if (yearlessMatch && defaultYear) {
    const day = yearlessMatch[1].padStart(2, '0');
    const part2 = yearlessMatch[2].slice(0, 3).toLowerCase();
    const month = MONTH_MAP[part2] || part2.padStart(2, '0');
    return toIsoDate(`${defaultYear}-${month}-${day}`);
  }

  return null;
}

/**
 * Formats ISO date to human readable 'DD MMM YYYY'
 */
export function formatDisplayDate(iso: IsoDate): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const monthIdx = Number.parseInt(m, 10) - 1;
  return `${d} ${monthNames[monthIdx] || m} ${y}`;
}

/**
 * Month identifier YYYY-MM
 */
export function getYearMonth(iso: IsoDate): string {
  return iso.substring(0, 7);
}
