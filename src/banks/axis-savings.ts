import type { BankTemplate } from '@/pipeline/parse/types';
import type { BankId } from '@/types/brands';

export const axisSavingsTemplate: BankTemplate = {
  id: 'axis-savings',
  version: 1,
  bank: 'AXIS' as BankId,
  product: 'savings',
  detect: {
    allOf: ['AXIS BANK'],
    anyOf: ['Statement of Account', 'Particulars', 'Customer ID'],
  },
  header: {
    date: ['Tran Date', 'Date'],
    valueDate: ['Value Date'],
    narration: ['Particulars', 'Description'],
    ref: ['Chq No'],
    debit: ['Debit', 'Withdrawal'],
    credit: ['Credit', 'Deposit'],
    balance: ['Balance'],
  },
  dates: {
    formats: ['DD-MM-YYYY', 'DD/MM/YYYY'],
  },
  amounts: {
    style: 'split-columns',
  },
  balanceModel: 'running',
  rows: {
    continuation: 'no-date-in-date-column',
    ignoreLines: ['^AXIS BANK', '^Page \\d+'],
  },
};
