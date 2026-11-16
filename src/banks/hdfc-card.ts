import type { BankTemplate } from '@/pipeline/parse/types';
import type { BankId } from '@/types/brands';

export const hdfcCardTemplate: BankTemplate = {
  id: 'hdfc-card',
  version: 1,
  bank: 'HDFC' as BankId,
  product: 'card',
  detect: {
    allOf: ['HDFC', 'Card'],
    anyOf: ['Payment Due Date', 'Total Dues', 'Credit Limit', 'Reward Points'],
  },
  header: {
    date: ['Date', 'Txn Date'],
    narration: ['Transaction Description', 'Description'],
    amount: ['Amount', 'Amount (Rs.)', 'Item Amount'],
  },
  dates: {
    formats: ['DD/MM/YYYY', 'DD-MM-YYYY', 'DD/MM/YY'],
  },
  amounts: {
    style: 'drcr-suffix',
  },
  balanceModel: 'cycle-summary',
  rows: {
    continuation: 'no-date-in-date-column',
    ignoreLines: ['^GST', '^Card Member', '^Page \\d+'],
  },
};
