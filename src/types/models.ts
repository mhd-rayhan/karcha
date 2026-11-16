import type { BankId, CategoryId, IsoDate, Paise } from './brands';

export type { BankId, CategoryId, IsoDate, Paise };

export type AccountProduct = 'savings' | 'current' | 'card';

export interface Account {
  id: string;
  bank: BankId;
  product: AccountProduct;
  last4: string;
  label?: string;
}

export type VerificationState = 'verified' | 'needs-review' | 'cannot-verify';

export type IssueCode =
  | 'BAL_CHAIN'
  | 'OPEN_CLOSE'
  | 'TOTALS'
  | 'DATE_RANGE'
  | 'DATE_ORDER'
  | 'AMOUNT_SANITY'
  | 'NO_TEXT'
  | 'LAYOUT_UNKNOWN'
  | 'LAYOUT_DRIFT';

export interface Issue {
  code: IssueCode;
  severity: 'error' | 'warn';
  message: string;
  txnId?: string;
  page?: number;
  diffPaise?: Paise;
}

export interface Statement {
  id: string;
  accountId: string;
  periodStart: IsoDate;
  periodEnd: IsoDate;
  opening?: Paise;
  closing?: Paise;
  printedTotals?: {
    moneyIn?: Paise;
    moneyOut?: Paise;
  };
  verification: VerificationState;
  issues: Issue[];
  parser: {
    id: string;
    version: string;
    layoutFingerprint: string;
  };
  importedAt: number;
}

export type TxnChannel =
  | 'upi'
  | 'neft'
  | 'imps'
  | 'rtgs'
  | 'pos'
  | 'ach'
  | 'atm'
  | 'cheque'
  | 'card'
  | 'other';

export type CategorySource = 'manual' | 'user-rule' | 'learned' | 'bundled' | 'none';

export type TxnFlag = 'transfer' | 'fee' | 'recurring' | 'unusual' | 'ignored' | 'needs-review';

export interface Txn {
  id: string; // dedup key: 16-hex sha-256 over tuple + occurrence k
  statementId: string;
  accountId: string;
  date: IsoDate;
  valueDate?: IsoDate;
  amount: Paise; // signed integer: credit +, debit -
  balanceAfter?: Paise;
  narration: string; // raw and untrusted, render as text only
  merchant?: string; // normalised key
  ref?: string; // UTR, RRN, cheque number
  channel?: TxnChannel;
  category: CategoryId;
  categoryRuleId?: string;
  categorySource: CategorySource;
  flags: TxnFlag[];
  source: {
    page: number;
    line: number;
  };
}

export interface Rule {
  id: string;
  pattern: string;
  type: 'merchant' | 'vpa' | 'contains' | 'regex';
  targetCategory: CategoryId;
  priority: 'user' | 'learned' | 'bundled';
  createdAt: number;
}

export interface Settings {
  persistence: 'session' | 'device';
  theme: 'light' | 'dark' | 'system';
  hideIgnoredRows: boolean;
  unusualMultiplier: number; // default: 3
}

export interface CategoryDefinition {
  id: CategoryId;
  name: string;
  parent?: CategoryId;
  icon?: string;
  color?: string;
}
