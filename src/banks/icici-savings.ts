import type { BankTemplate } from '@/pipeline/parse/types';
import type { BankId } from '@/types/brands';

export const iciciSavingsTemplate: BankTemplate = {
  id: 'icici-savings',
  version: 1,
  bank: 'ICICI' as BankId,
  product: 'savings',
  detect: {
    allOf: ['ICICI'],
    anyOf: [
      'Statement of Account',
      'Account Statement',
      'Transaction Details',
      'Transactions List',
      'OpTransactionHistory',
      'DETAILED STATEMENT',
    ],
    noneOf: [
      'Credit Card Statement',
      'Payment Due Date',
      'Total Amount Due',
      'Credit Limit',
      'Primary Card No',
    ],
  },
  header: {
    valueDate: ['Value Date', 'Value Dt'],
    date: ['Transaction Date', 'Txn Date', 'Date'],
    narration: ['Transaction Remarks', 'Description', 'Particulars', 'Narration'],
    debit: ['Withdrawal Amount(INR)', 'Withdrawal Amount', 'Withdrawal', 'Debit Amount', 'Debit'],
    credit: ['Deposit Amount(INR)', 'Deposit Amount', 'Deposit', 'Credit Amount', 'Credit'],
    balance: ['Balance(INR)', 'Balance (INR)', 'Balance', 'Running Balance'],
    ref: ['Cheque Number', 'Cheque No.', 'Ref No.', 'Cheque No / Ref No'],
  },
  dates: {
    formats: ['DD/MM/YYYY', 'DD-MM-YYYY', 'DD/MM/YY'],
  },
  amounts: {
    style: 'split-columns',
  },
  balanceModel: 'running',
  rows: {
    continuation: 'no-date-in-date-column',
    ignoreLines: [
      '^Page \\d+ of \\d+',
      '^Total',
      '^Opening Balance',
      '^Closing Balance',
      '^Legends Used in Account Statement',
      '^\\d+\\.\\s+[A-Z]+',
    ],
    stopLines: ['^Legends Used in Account Statement', '^End of Statement'],
  },
};
