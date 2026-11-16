import type { BankTemplate } from '@/pipeline/parse/types';
import type { BankId } from '@/types/brands';

export const kotakSavingsTemplate: BankTemplate = {
  id: 'kotak-savings',
  version: 1,
  bank: 'KOTAK' as BankId,
  product: 'savings',
  detect: {
    allOf: ['Kotak|KKBK000'],
    anyOf: [
      'Account Statement',
      'Statement of Account',
      'CRN',
      'Cust. Reln. No.',
      'Savings Account Transactions',
      'Account Summary',
    ],
    noneOf: ['Credit Card Statement', 'Card Member'],
  },
  header: {
    date: ['Date', 'Transaction Date'],
    narration: ['Description', 'Narration'],
    ref: ['Chq /Ref No.', 'Chq / Ref No', 'Chq/Ref. No.'],
    valueDate: ['Value Date', 'Value Dt'],
    debit: ['Withdrawal', 'Debit (Dr)', 'Withdrawal (Dr.)'],
    credit: ['Deposit', 'Credit (Cr)', 'Deposit (Cr.)'],
    amount: ['Amount'],
    drCr: ['Dr / Cr', 'Dr/Cr', 'Dr / Cr.'],
    balance: ['Balance', 'Balance (INR)'],
  },
  dates: {
    formats: ['DD-MMM-YYYY', 'DD/MM/YYYY', 'DD MMM YYYY'],
  },
  amounts: {
    style: 'amount-with-drcr-column',
  },
  balanceModel: 'running',
  rows: {
    continuation: 'no-date-in-date-column',
    ignoreLines: ['^Kotak Mahindra Bank', '^Page \\d+ of \\d+', '^Statement Generated on'],
    stopLines: [
      '^Important Note:',
      '^End of Statement',
      '^Closing Balance as on',
      '^Commonly Used Narrations',
    ],
  },
};
