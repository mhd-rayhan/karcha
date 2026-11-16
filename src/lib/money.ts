import type { Paise } from '@/types/brands';

/**
 * Converts a rupee number or string to integer Paise.
 * Uses exact rounding on cents/paise to avoid IEEE 754 float representation bugs.
 */
export function toPaise(rupees: number | string): Paise {
  if (typeof rupees === 'string') {
    // Clean currency symbols, commas, spaces
    const cleaned = rupees.replace(/[₹,\s]/g, '').trim();
    if (!cleaned) return 0 as Paise;
    const num = Number.parseFloat(cleaned);
    if (Number.isNaN(num)) return 0 as Paise;
    return Math.round(num * 100) as Paise;
  }
  return Math.round(rupees * 100) as Paise;
}

export function paiseToRupees(p: Paise): number {
  return p / 100;
}

export function addPaise(a: Paise, b: Paise): Paise {
  return (a + b) as Paise;
}

export function subPaise(a: Paise, b: Paise): Paise {
  return (a - b) as Paise;
}

export function absPaise(p: Paise): Paise {
  return Math.abs(p) as Paise;
}

/**
 * Formats integer Paise with Indian Lakh / Crore numbering grouping.
 * Example: 123456789 paise = ₹12,34,567.89
 */
export function formatPaise(
  p: Paise,
  options: {
    showSign?: boolean;
    hideCurrency?: boolean;
    compact?: boolean;
  } = {},
): string {
  const isNegative = p < 0;
  const absP = Math.abs(p);
  const rupees = Math.floor(absP / 100);
  const paiseRemainder = absP % 100;

  let rupeeStr = rupees.toString();
  // Indian numbering: last 3 digits, then groups of 2
  if (rupeeStr.length > 3) {
    const lastThree = rupeeStr.substring(rupeeStr.length - 3);
    const otherNumbers = rupeeStr.substring(0, rupeeStr.length - 3);
    const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    rupeeStr = `${formattedOther},${lastThree}`;
  }

  const formattedPaise = paiseRemainder.toString().padStart(2, '0');
  const currencySymbol = options.hideCurrency ? '' : '₹';

  let sign = '';
  if (isNegative) {
    sign = '-';
  } else if (options.showSign && p > 0) {
    sign = '+';
  }

  return `${sign}${currencySymbol}${rupeeStr}.${formattedPaise}`;
}
