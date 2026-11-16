import type { BankTemplate } from '@/pipeline/parse/types';
import type { BankId } from '@/types/brands';

export const hdfcSavingsTemplate: BankTemplate = {
  id: 'hdfc-savings',
  version: 1,
  bank: 'HDFC' as BankId,
  product: 'savings',
  detect: {
    allOf: ['HDFC BANK|HDFC000'],
    anyOf: [
      'Statement of Account',
      'Statement of accounts',
      'Account Branch',
      'Customer ID',
      'Cust ID',
    ],
    noneOf: ['Credit Card Statement', 'Card Member'],
  },
  header: {
    date: ['Date'],
    narration: ['Narration'],
    ref: ['Chq./Ref.No.', 'Ref.No.', 'Chq. / Ref. No.', 'Chq/Ref.No.'],
    valueDate: ['Value Dt', 'Value Date'],
    debit: ['Withdrawal Amt.', 'Debit'],
    credit: ['Deposit Amt.', 'Credit'],
    balance: ['Closing Balance', 'Balance'],
  },
  dates: {
    formats: ['DD/MM/YY', 'DD/MM/YYYY'],
  },
  amounts: {
    style: 'split-columns',
  },
  balanceModel: 'running',
  rows: {
    continuation: 'no-date-in-date-column',
    ignoreLines: ['^HDFC BANK', '^Page No', '^Generated on', '^\\*+', '^\\-+'],
    stopLines: ['^STATEMENT SUMMARY', '^---\\s*End Of Statement', '^HDFC Bank GSTIN'],
  },
};
