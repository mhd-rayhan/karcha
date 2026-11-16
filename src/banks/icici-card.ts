import type { BankTemplate } from '@/pipeline/parse/types';
import type { BankId } from '@/types/brands';

export const iciciCardTemplate: BankTemplate = {
  id: 'icici-card',
  version: 1,
  bank: 'ICICI' as BankId,
  product: 'card',
  detect: {
    allOf: ['ICICI'],
    anyOf: [
      'Credit Card Statement',
      'Card Statement',
      'Payment Due Date',
      'Total Amount Due',
      'Credit Limit',
      'Primary Card No',
      'Card Number',
      'Reward Points',
    ],
    noneOf: [
      'DETAILED STATEMENT',
      'OpTransactionHistory',
      'Transactions List',
      'Statement of Account',
      'Account Statement',
      'Legends Used in Account Statement',
    ],
  },
  header: {
    date: ['Date', 'Txn Date', 'Transaction Date'],
    narration: ['Transaction Details', 'Description', 'Particulars', 'Details'],
    amount: [
      'Amount',
      'Amount (INR)',
      'Amount (Rs.)',
      'Amount(in Rs)',
      'Item Amount',
      'Amount (in Rs.)',
    ],
    ref: ['Ref Number', 'Reference', 'Ref No', 'Ref No.', 'Reference Number'],
  },
  dates: {
    formats: ['DD/MM/YYYY', 'DD-MMM-YYYY', 'DD/MM/YY'],
  },
  amounts: {
    style: 'drcr-suffix',
  },
  balanceModel: 'cycle-summary',
  rows: {
    continuation: 'no-date-in-date-column',
    ignoreLines: ['^Total', '^Please check', '^Page \\d+'],
  },
};
