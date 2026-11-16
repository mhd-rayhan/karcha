import type { BankTemplate } from '@/pipeline/parse/types';
import { axisSavingsTemplate } from './axis-savings';
import { hdfcCardTemplate } from './hdfc-card';
import { hdfcSavingsTemplate } from './hdfc-savings';
import { iciciCardTemplate } from './icici-card';
import { iciciSavingsTemplate } from './icici-savings';
import { kotakSavingsTemplate } from './kotak-savings';
import { sbiSavingsTemplate } from './sbi-savings';

export const allTemplates: BankTemplate[] = [
  iciciSavingsTemplate,
  iciciCardTemplate,
  hdfcSavingsTemplate,
  hdfcCardTemplate,
  sbiSavingsTemplate,
  axisSavingsTemplate,
  kotakSavingsTemplate,
];
