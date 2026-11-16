import { signal } from '@preact/signals';
import type { Account, CategoryId, Rule, Settings, Statement, Txn, TxnFlag } from '@/types/models';
import { clearDB, saveToDB } from './persistence';

export type AppTab =
  | 'import'
  | 'overview'
  | 'transactions'
  | 'review'
  | 'intelligence'
  | 'settings';

// Core State Signals
export const accounts = signal<Account[]>([]);
export const statements = signal<Statement[]>([]);
export const txns = signal<Txn[]>([]);
export const rules = signal<Rule[]>([]);
export const settings = signal<Settings>({
  persistence: 'session',
  theme: 'system',
  hideIgnoredRows: false,
  unusualMultiplier: 3,
});

// UI State Signals
export const activeTab = signal<AppTab>('import');
export const selectedStatementId = signal<string | null>(null);
export const searchQuery = signal<string>('');
export const filterAccountId = signal<string | 'all'>('all');
export const filterCategory = signal<CategoryId | 'all'>('all');
export const filterDirection = signal<'all' | 'in' | 'out'>('all');
export type GroupByField =
  | 'none'
  | 'date'
  | 'month'
  | 'category'
  | 'account'
  | 'merchant'
  | 'upi_app'
  | 'counterparty_bank'
  | 'statement';
export const groupByField = signal<GroupByField>('none');
export const sortField = signal<'date' | 'amount' | 'merchant'>('date');
export const sortAsc = signal<boolean>(false);
export const hasUnsavedData = signal<boolean>(false);

// Actions
export function addStatementData(newAccount: Account, newStatement: Statement, newTxns: Txn[]) {
  // 1. Account
  const existingAcc = accounts.value.find((a) => a.id === newAccount.id);
  if (!existingAcc) {
    accounts.value = [...accounts.value, newAccount];
  }

  // 2. Statement
  statements.value = [...statements.value.filter((s) => s.id !== newStatement.id), newStatement];

  // 3. Transactions
  const existingMap = new Map(txns.value.map((t) => [t.id, t]));
  for (const t of newTxns) {
    existingMap.set(t.id, t);
  }
  txns.value = Array.from(existingMap.values()).sort((a, b) => b.date.localeCompare(a.date));

  hasUnsavedData.value = true;
  selectedStatementId.value = newStatement.id;

  // Auto-switch to review if issues exist, else overview
  if (newStatement.issues.length > 0 || newStatement.verification === 'needs-review') {
    activeTab.value = 'review';
  } else {
    activeTab.value = 'overview';
  }

  if (settings.value.persistence === 'device') {
    saveToDB();
  }
}

export function updateTxn(txnId: string, updates: Partial<Txn>, applyToSimilar = false) {
  const current = txns.value.find((t) => t.id === txnId);
  if (!current) return;

  const targetCategory = updates.category;

  // If user changed category and asked to apply to similar, create a learned rule
  if (targetCategory && applyToSimilar && current.merchant) {
    const newRule: Rule = {
      id: `learned-${Date.now()}`,
      pattern: current.merchant,
      type: 'contains',
      targetCategory,
      priority: 'learned',
      createdAt: Date.now(),
    };
    rules.value = [newRule, ...rules.value];
  }

  txns.value = txns.value.map((t) => {
    if (t.id === txnId) {
      return { ...t, ...updates };
    }
    // If applying to similar by merchant
    if (applyToSimilar && targetCategory && t.merchant === current.merchant) {
      return { ...t, category: targetCategory, categorySource: 'learned' };
    }
    return t;
  });

  hasUnsavedData.value = true;
  if (settings.value.persistence === 'device') {
    saveToDB();
  }
}

export function toggleTxnFlag(txnId: string, flag: TxnFlag) {
  txns.value = txns.value.map((t) => {
    if (t.id !== txnId) return t;
    const has = t.flags.includes(flag);
    const flags = has ? t.flags.filter((f) => f !== flag) : [...t.flags, flag];
    return { ...t, flags };
  });
  hasUnsavedData.value = true;
  if (settings.value.persistence === 'device') {
    saveToDB();
  }
}

export function deleteStatement(statementId: string) {
  statements.value = statements.value.filter((s) => s.id !== statementId);
  txns.value = txns.value.filter((t) => t.statementId !== statementId);
  if (selectedStatementId.value === statementId) {
    selectedStatementId.value = statements.value[0]?.id || null;
  }
  if (statements.value.length === 0) {
    activeTab.value = 'import';
  }
  if (settings.value.persistence === 'device') {
    saveToDB();
  }
}

export function clearAllData() {
  accounts.value = [];
  statements.value = [];
  txns.value = [];
  rules.value = [];
  hasUnsavedData.value = false;
  selectedStatementId.value = null;
  activeTab.value = 'import';
  clearDB();
}
