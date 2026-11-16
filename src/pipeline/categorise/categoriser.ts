import type { CategoryId, Paise } from '@/types/brands';
import type { CategorySource, Rule, TxnFlag } from '@/types/models';
import { getCanonicalMerchant, parseNarration } from './merchant';

export interface CategoriseResult {
  category: CategoryId;
  categoryRuleId?: string;
  categorySource: CategorySource;
  merchant?: string;
  flags: TxnFlag[];
}

export function categoriseTxn(
  narration: string,
  amount: Paise,
  activeRules: Rule[],
): CategoriseResult {
  const norm = narration.trim();
  const upper = norm.toUpperCase();
  const parsed = parseNarration(norm);
  const flags: TxnFlag[] = [];

  // Fee flag detection
  if (
    upper.includes('ANNUAL FEE') ||
    upper.includes('GST ON') ||
    upper.includes('BANK CHARGES') ||
    upper.includes('FINANCE CHARGE') ||
    upper.includes('LATE PAYMENT') ||
    upper.includes('FOREX MARKUP') ||
    upper.includes('INTEREST CHG') ||
    upper.includes('IMPS CHG')
  ) {
    flags.push('fee');
  }

  // 1. Check User Rules
  const userRules = activeRules.filter((r) => r.priority === 'user');
  for (const rule of userRules) {
    if (matchesRule(norm, parsed.vpa, rule)) {
      return {
        category: rule.targetCategory,
        categoryRuleId: rule.id,
        categorySource: 'user-rule',
        merchant: parsed.cleanMerchant,
        flags,
      };
    }
  }

  // 2. Check Learned Rules
  const learnedRules = activeRules.filter((r) => r.priority === 'learned');
  for (const rule of learnedRules) {
    if (matchesRule(norm, parsed.vpa, rule)) {
      return {
        category: rule.targetCategory,
        categoryRuleId: rule.id,
        categorySource: 'learned',
        merchant: parsed.cleanMerchant,
        flags,
      };
    }
  }

  // 3. Bundled Merchant Dictionary
  const bundled = getCanonicalMerchant(norm);
  if (bundled.categoryId) {
    return {
      category: bundled.categoryId as CategoryId,
      categorySource: 'bundled',
      merchant: bundled.merchantName,
      flags,
    };
  }

  // 4. Default rules based on channel or amount direction
  if (amount > 0 && (upper.includes('SALARY') || upper.includes('SAL '))) {
    return {
      category: 'income:salary' as CategoryId,
      categorySource: 'bundled',
      merchant: 'Employer Salary',
      flags,
    };
  }

  if (amount > 0 && upper.includes('INT.PD')) {
    return {
      category: 'income:interest' as CategoryId,
      categorySource: 'bundled',
      merchant: 'Bank Interest',
      flags,
    };
  }

  return {
    category: 'uncategorised' as CategoryId,
    categorySource: 'none',
    merchant: bundled.merchantName,
    flags,
  };
}

function matchesRule(narration: string, vpa: string | undefined, rule: Rule): boolean {
  const text = narration.toLowerCase();
  const pattern = rule.pattern.toLowerCase();

  switch (rule.type) {
    case 'merchant':
    case 'contains':
      return text.includes(pattern);
    case 'vpa':
      return Boolean(vpa?.toLowerCase().includes(pattern));
    case 'regex':
      try {
        return new RegExp(rule.pattern, 'i').test(narration);
      } catch {
        return false;
      }
    default:
      return false;
  }
}
