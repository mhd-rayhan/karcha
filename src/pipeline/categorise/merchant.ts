import merchantsJson from '@/data/merchants.json';
import narrationPatterns from '@/data/narration-patterns.json';
import type { TxnChannel } from '@/types/models';

export interface ParsedNarration {
  channel: TxnChannel;
  cleanMerchant?: string;
  ref?: string;
  payee?: string;
  vpa?: string;
}

/**
 * Parses channel, reference number, and merchant/payee from raw Indian bank narration.
 */
export function parseNarration(raw: string): ParsedNarration {
  const norm = raw.trim();
  const upper = norm.toUpperCase();

  // 1. Check UPI patterns
  if (upper.includes('UPI')) {
    for (const rule of narrationPatterns.upi) {
      const match = norm.match(new RegExp(rule.pattern, 'i'));
      if (match) {
        return {
          channel: 'upi',
          ref: rule.fields.ref ? match[rule.fields.ref] : undefined,
          payee: rule.fields.payee ? cleanPayeeName(match[rule.fields.payee]) : undefined,
          vpa: rule.fields.vpa ? match[rule.fields.vpa] : undefined,
        };
      }
    }
    return { channel: 'upi', cleanMerchant: cleanPayeeName(norm) };
  }

  // 2. Check IMPS
  if (upper.includes('IMPS')) {
    for (const rule of narrationPatterns.imps) {
      const match = norm.match(new RegExp(rule.pattern, 'i'));
      if (match) {
        return {
          channel: 'imps',
          ref: rule.fields.ref ? match[rule.fields.ref] : undefined,
          payee: rule.fields.payee ? cleanPayeeName(match[rule.fields.payee]) : undefined,
        };
      }
    }
    return { channel: 'imps', cleanMerchant: cleanPayeeName(norm) };
  }

  // 3. Check NEFT
  if (upper.includes('NEFT')) {
    for (const rule of narrationPatterns.neft) {
      const match = norm.match(new RegExp(rule.pattern, 'i'));
      if (match) {
        return {
          channel: 'neft',
          ref: rule.fields.ref ? match[rule.fields.ref] : undefined,
          payee: rule.fields.payee ? cleanPayeeName(match[rule.fields.payee]) : undefined,
        };
      }
    }
    return { channel: 'neft', cleanMerchant: cleanPayeeName(norm) };
  }

  // 4. POS / Card transaction
  if (
    upper.includes('POS ') ||
    upper.startsWith('POS/') ||
    upper.includes('CARD') ||
    upper.includes('E-COMM')
  ) {
    return {
      channel: 'pos',
      cleanMerchant: cleanCardMerchant(norm),
    };
  }

  // 5. ATM withdrawal
  if (upper.includes('ATM') || upper.includes('NFS*') || upper.includes('CASH WDL')) {
    return { channel: 'atm', cleanMerchant: 'ATM Cash Withdrawal' };
  }

  // 6. ACH / NACH / AutoPay
  if (upper.includes('ACH/') || upper.includes('NACH/') || upper.includes('AUTOPAY')) {
    return { channel: 'ach', cleanMerchant: cleanPayeeName(norm) };
  }

  // 7. Cheque
  if (upper.includes('CHQ') || upper.includes('CHEQUE')) {
    return { channel: 'cheque', cleanMerchant: 'Cheque Payment' };
  }

  return { channel: 'other', cleanMerchant: cleanPayeeName(norm) };
}

function cleanPayeeName(name: string): string {
  if (!name) return '';
  return name
    .replace(/^UPI\//i, '')
    .replace(/\b(P2A|P2P|CR|DR)\b/gi, '')
    .replace(/[\d]{10,}/g, '') // remove long digit runs
    .replace(/[@/\\_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanCardMerchant(narration: string): string {
  return narration
    .replace(/^POS\s+/i, '')
    .replace(/\b(IN|IND|MUMBAI|DELHI|BANGALORE|BENGALURU|HYDERABAD|CHENNAI|PUNE|KOLKATA)\b/gi, '')
    .replace(/[\d]{6,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalises a merchant key to canonical name via bundled merchant table.
 */
export function getCanonicalMerchant(narration: string): {
  merchantName: string;
  categoryId?: string;
} {
  const upper = narration.toUpperCase();
  for (const entry of merchantsJson) {
    if (upper.includes(entry.pattern)) {
      return { merchantName: entry.merchant, categoryId: entry.category };
    }
  }

  const parsed = parseNarration(narration);
  const fallback = parsed.payee || parsed.cleanMerchant || narration.substring(0, 30);
  return { merchantName: fallback };
}

/**
 * Resolves the UPI app, PSP, or channel provider from narration, VPA handle, or channel.
 */
export function resolveUpiApp(narration: string, refOrVpa?: string, channel?: TxnChannel): string {
  const text = `${narration} ${refOrVpa || ''}`.toLowerCase();

  // 1. UPI Apps / Handles
  if (
    text.includes('@ybl') ||
    text.includes('@ibl') ||
    text.includes('@axl') ||
    text.includes('phonepe')
  ) {
    return 'PhonePe';
  }
  if (
    text.includes('@okhdfcbank') ||
    text.includes('@okaxis') ||
    text.includes('@oksbi') ||
    text.includes('@okicici') ||
    text.includes('googlepay') ||
    text.includes('gpay')
  ) {
    return 'Google Pay';
  }
  if (
    text.includes('@paytm') ||
    text.includes('@ptyes') ||
    text.includes('@ptaxis') ||
    text.includes('paytm')
  ) {
    return 'Paytm';
  }
  if (text.includes('@upi') || text.includes('bhim')) {
    return 'BHIM';
  }
  if (text.includes('@cred')) {
    return 'CRED';
  }
  if (
    text.includes('@apl') ||
    text.includes('@rapl') ||
    text.includes('@yapl') ||
    text.includes('amazonpay')
  ) {
    return 'Amazon Pay';
  }
  if (
    text.includes('@waaxis') ||
    text.includes('@wahdfc') ||
    text.includes('@waicici') ||
    text.includes('@wasbi')
  ) {
    return 'WhatsApp Pay';
  }
  if (text.includes('@superyes') || text.includes('super.money')) {
    return 'super.money';
  }
  if (text.includes('@navi')) {
    return 'Navi';
  }
  if (text.includes('@kotak') || text.includes('@kmbl')) {
    return 'Kotak 811 / UPI';
  }
  if (text.includes('@hdfcbank')) {
    return 'HDFC PayZapp';
  }
  if (text.includes('@icici')) {
    return 'ICICI iMobile';
  }
  if (text.includes('upi')) {
    return 'Other UPI App';
  }

  // 2. Non-UPI Channels
  if (channel === 'pos' || channel === 'card' || /pos|card|e-comm/i.test(narration)) {
    return 'Debit / Credit Card';
  }
  if (channel === 'imps' || /imps/i.test(narration)) {
    return 'IMPS Transfer';
  }
  if (channel === 'neft' || channel === 'rtgs' || /neft|rtgs/i.test(narration)) {
    return 'NEFT / RTGS Transfer';
  }
  if (channel === 'atm' || /atm|cash wdl|nfs/i.test(narration)) {
    return 'ATM Cash';
  }
  if (channel === 'ach' || /ach|nach|autopay|mandate/i.test(narration)) {
    return 'AutoPay / Mandate';
  }
  if (channel === 'cheque' || /chq|cheque/i.test(narration)) {
    return 'Cheque';
  }

  return 'Netbanking / Other';
}

/**
 * Resolves beneficiary or destination bank from narration or IFSC/bank indicators.
 */
export function resolveCounterpartyBank(narration: string): string {
  const upper = narration.toUpperCase();

  // 1. Explicit Bank Name with "BANK" or unique compound name
  if (/\b(STATE BANK OF INDIA|STATE BANK)\b/.test(upper)) {
    return 'State Bank of India';
  }
  if (/\b(KOTAK MAHINDRA|KOTAK BANK)\b/.test(upper)) {
    return 'Kotak Mahindra Bank';
  }
  if (/\b(YES BANK|YESB0\d*)\b/.test(upper)) {
    return 'Yes Bank';
  }
  if (/\b(BANK OF BARODA|BOB)\b/.test(upper)) {
    return 'Bank of Baroda';
  }
  if (/\b(CANARA BANK|CANARA|CNRB0\d*)\b/.test(upper)) {
    return 'Canara Bank';
  }
  if (/\b(IDFC FIRST BANK|IDFC FIRST|IDFB0\d*)\b/.test(upper)) {
    return 'IDFC FIRST Bank';
  }
  if (/\b(PUNJAB NATIONAL BANK|PNB|PUNB0\d*)\b/.test(upper)) {
    return 'Punjab National Bank';
  }
  if (/\b(UNION BANK OF INDIA|UNION BANK|UBIN0\d*)\b/.test(upper)) {
    return 'Union Bank of India';
  }
  if (/\b(INDUSIND BANK|INDUSIND|INDB0\d*)\b/.test(upper)) {
    return 'IndusInd Bank';
  }
  if (/\b(FEDERAL BANK|FDRL0\d*)\b/.test(upper)) {
    return 'Federal Bank';
  }
  if (/\b(HDFC BANK|HDFC0\d*)\b/.test(upper)) {
    return 'HDFC Bank';
  }
  if (/\b(ICICI BANK|ICIC0\d*)\b/.test(upper)) {
    return 'ICICI Bank';
  }
  if (/\b(AXIS BANK|UTIB0\d*)\b/.test(upper)) {
    return 'Axis Bank';
  }
  if (/\b(PAYTM PAYMENTS BANK|PYTM0\d*)\b/.test(upper)) {
    return 'Paytm Payments Bank';
  }
  if (/\b(AIRTEL PAYMENTS BANK|AIRP0\d*)\b/.test(upper)) {
    return 'Airtel Payments Bank';
  }
  if (/\b(STANDARD CHARTERED|STANCHAR|SCBL0\d*)\b/.test(upper)) {
    return 'Standard Chartered';
  }

  // 2. Standalone acronyms / IFSC indicators (ignoring @vpa prefixes)
  const nonVpaText = upper.replace(/@[a-zA-Z0-9.-]+/g, ' ');

  if (/\b(SBI|SBIN\d*)\b/.test(nonVpaText)) {
    return 'State Bank of India';
  }
  if (/\b(KOTAK|KKBK\d*)\b/.test(nonVpaText)) {
    return 'Kotak Mahindra Bank';
  }
  if (/\b(HDFC)\b/.test(nonVpaText)) {
    return 'HDFC Bank';
  }
  if (/\b(ICICI)\b/.test(nonVpaText)) {
    return 'ICICI Bank';
  }
  if (/\b(AXIS)\b/.test(nonVpaText)) {
    return 'Axis Bank';
  }
  if (/\b(HSBC|CITIBANK|CITI)\b/.test(nonVpaText)) {
    return 'Foreign / Global Bank';
  }

  return 'Own Bank / Counterparty Unspecified';
}
