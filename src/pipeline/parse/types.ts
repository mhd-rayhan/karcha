import type { BankId, IsoDate, Paise } from '@/types/brands';
import type { AccountProduct, Issue, Statement } from '@/types/models';
import type { ExtractedDoc } from '../extract/types';

export interface BankTemplate {
  id: string;
  version: number;
  bank: BankId;
  product: AccountProduct;
  detect: {
    allOf?: string[];
    anyOf?: string[];
    noneOf?: string[];
  };
  header: {
    date: string[];
    narration: string[];
    debit?: string[];
    credit?: string[];
    amount?: string[];
    drCr?: string[];
    balance?: string[];
    ref?: string[];
    valueDate?: string[];
  };
  dates: {
    formats: string[];
    yearless?: boolean;
  };
  amounts: {
    style: 'split-columns' | 'signed-column' | 'drcr-suffix' | 'amount-with-drcr-column';
  };
  balanceModel: 'running' | 'cycle-summary';
  rows: {
    continuation?: 'no-date-in-date-column';
    ignoreLines?: string[];
    stopLines?: string[];
  };
}

export interface RawParsedTxn {
  date: IsoDate;
  valueDate?: IsoDate;
  narration: string;
  amount: Paise;
  balanceAfter?: Paise;
  ref?: string;
  source: {
    page: number;
    line: number;
  };
}

export interface ParseResult {
  statement: Omit<Statement, 'id' | 'importedAt' | 'verification' | 'issues'>;
  account: {
    bank: BankId;
    product: AccountProduct;
    last4: string;
  };
  txns: RawParsedTxn[];
  issues: Issue[];
}

export interface StatementParser {
  id: string;
  version: string;
  detect(doc: ExtractedDoc): number;
  parse(doc: ExtractedDoc): ParseResult;
}
