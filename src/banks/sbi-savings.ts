import type { BankTemplate } from '@/pipeline/parse/types';
import type { BankId } from '@/types/brands';

export const sbiSavingsTemplate: BankTemplate = {
  id: 'sbi-savings',
  version: 1,
  bank: 'SBI' as BankId,
  product: 'savings',
  detect: {
    allOf: ['STATE BANK OF INDIA'],
    anyOf: ['Account Statement', 'Statement of Account', 'INB Reference'],
  },
  header: {
    date: ['Txn Date', 'Date'],
    valueDate: ['Value Date'],
    narration: ['Description', 'Particulars'],
    ref: ['Ref No./Cheque No.', 'Ref No'],
    debit: ['Debit'],
    credit: ['Credit'],
    balance: ['Balance'],
  },
  dates: {
    formats: ['DD-MMM-YYYY', 'DD/MM/YYYY'],
  },
  amounts: {
    style: 'split-columns',
  },
  balanceModel: 'running',
  rows: {
    continuation: 'no-date-in-date-column',
    ignoreLines: ['^Page No', '^STATEMENT OF ACCOUNT'],
  },
};
