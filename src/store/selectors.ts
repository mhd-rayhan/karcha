import categoriesJson from '@/data/categories.json';
import { formatDisplayDate } from '@/lib/dates';
import { paiseToRupees } from '@/lib/money';
import {
  getCanonicalMerchant,
  resolveCounterpartyBank,
  resolveUpiApp,
} from '@/pipeline/categorise/merchant';
import type { Paise } from '@/types/brands';
import type { Txn } from '@/types/models';
import { computed } from '@preact/signals';
import {
  accounts,
  filterAccountId,
  filterCategory,
  filterDirection,
  groupByField,
  searchQuery,
  selectedStatementId,
  settings,
  sortAsc,
  sortField,
  statements,
  txns,
} from './index';

// 1. Current Statement
export const currentStatement = computed(() => {
  if (!selectedStatementId.value) return statements.value[0] || null;
  return (
    statements.value.find((s) => s.id === selectedStatementId.value) || statements.value[0] || null
  );
});

// 2. Filtered & Sorted Transactions
export const filteredTxns = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const accFilter = filterAccountId.value;
  const catFilter = filterCategory.value;
  const dirFilter = filterDirection.value;
  const hideIgnored = settings.value.hideIgnoredRows;

  let list = txns.value.filter((t) => {
    if (hideIgnored && t.flags.includes('ignored')) return false;
    if (accFilter !== 'all' && t.accountId !== accFilter) return false;
    if (
      catFilter !== 'all' &&
      t.category !== catFilter &&
      !t.category.startsWith(`${catFilter}:`)
    ) {
      return false;
    }
    if (dirFilter === 'in' && t.amount <= 0) return false;
    if (dirFilter === 'out' && t.amount >= 0) return false;

    if (query) {
      const matchNarration = t.narration.toLowerCase().includes(query);
      const matchMerchant = t.merchant?.toLowerCase().includes(query);
      const matchRef = t.ref?.toLowerCase().includes(query);
      if (!matchNarration && !matchMerchant && !matchRef) return false;
    }
    return true;
  });

  const field = sortField.value;
  const asc = sortAsc.value;

  list = [...list].sort((a, b) => {
    let cmp = 0;
    if (field === 'date') cmp = a.date.localeCompare(b.date);
    else if (field === 'amount') cmp = a.amount - b.amount;
    else if (field === 'merchant') cmp = (a.merchant || '').localeCompare(b.merchant || '');
    return asc ? cmp : -cmp;
  });

  return list;
});

// 3. Money In, Money Out, Net Savings (Excluding transfers and ignored rows)
export const financialSummary = computed(() => {
  let moneyInPaise = 0 as Paise;
  let moneyOutPaise = 0 as Paise;

  for (const t of txns.value) {
    if (t.flags.includes('ignored') || t.flags.includes('transfer')) continue;
    if (filterAccountId.value !== 'all' && t.accountId !== filterAccountId.value) continue;

    if (t.amount > 0) {
      moneyInPaise = (moneyInPaise + t.amount) as Paise;
    } else {
      moneyOutPaise = (moneyOutPaise + Math.abs(t.amount)) as Paise;
    }
  }

  const netSavingsPaise = (moneyInPaise - moneyOutPaise) as Paise;

  return {
    moneyInPaise,
    moneyOutPaise,
    netSavingsPaise,
    moneyInRupees: paiseToRupees(moneyInPaise),
    moneyOutRupees: paiseToRupees(moneyOutPaise),
    netSavingsRupees: paiseToRupees(netSavingsPaise),
  };
});

// 4. Monthly Inflow vs Outflow for Recharts
export const monthlyChartData = computed(() => {
  const monthMap = new Map<string, { incomePaise: number; expensePaise: number }>();

  for (const t of txns.value) {
    if (t.flags.includes('ignored') || t.flags.includes('transfer')) continue;
    if (filterAccountId.value !== 'all' && t.accountId !== filterAccountId.value) continue;

    const month = t.date.substring(0, 7); // YYYY-MM
    const current = monthMap.get(month) || { incomePaise: 0, expensePaise: 0 };

    if (t.amount > 0) {
      current.incomePaise += t.amount;
    } else {
      current.expensePaise += Math.abs(t.amount);
    }
    monthMap.set(month, current);
  }

  const months = Array.from(monthMap.keys()).sort();
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return months.map((m) => {
    const val = monthMap.get(m)!;
    const [year, monthNum] = m.split('-');
    const label = `${monthNames[Number(monthNum) - 1]} '${year.slice(2)}`;
    return {
      monthKey: m,
      name: label,
      income: Number((val.incomePaise / 100).toFixed(2)),
      expense: Number((val.expensePaise / 100).toFixed(2)),
    };
  });
});

// 5. Category Breakdown (Expenses only)
export const categorySpendData = computed(() => {
  const catMap = new Map<string, number>();
  let totalExpensePaise = 0;

  for (const t of txns.value) {
    if (t.flags.includes('ignored') || t.flags.includes('transfer') || t.amount >= 0) continue;
    if (filterAccountId.value !== 'all' && t.accountId !== filterAccountId.value) continue;

    const parentCat = t.category.split(':')[0];
    const absAmt = Math.abs(t.amount);
    catMap.set(parentCat, (catMap.get(parentCat) || 0) + absAmt);
    totalExpensePaise += absAmt;
  }

  const result = [];
  for (const [catId, amountPaise] of catMap.entries()) {
    const catDef = categoriesJson.find((c) => c.id === catId);
    result.push({
      id: catId,
      name: catDef?.name || catId,
      amountPaise: amountPaise as Paise,
      amountRupees: Number((amountPaise / 100).toFixed(2)),
      percentage: totalExpensePaise > 0 ? (amountPaise / totalExpensePaise) * 100 : 0,
      color: catDef?.color || '#94a3b8',
    });
  }

  return result.sort((a, b) => b.amountRupees - a.amountRupees);
});

// 6. Top Merchants
export const topMerchantsData = computed(() => {
  const merchantMap = new Map<string, { totalPaise: number; count: number }>();

  for (const t of txns.value) {
    if (t.flags.includes('ignored') || t.flags.includes('transfer') || t.amount >= 0) continue;
    if (filterAccountId.value !== 'all' && t.accountId !== filterAccountId.value) continue;

    const name = t.merchant || 'Unknown Merchant';
    const current = merchantMap.get(name) || { totalPaise: 0, count: 0 };
    current.totalPaise += Math.abs(t.amount);
    current.count += 1;
    merchantMap.set(name, current);
  }

  return Array.from(merchantMap.entries())
    .map(([merchant, data]) => ({
      merchant,
      amountPaise: data.totalPaise as Paise,
      amountRupees: Number((data.totalPaise / 100).toFixed(2)),
      count: data.count,
    }))
    .sort((a, b) => b.amountRupees - a.amountRupees)
    .slice(0, 10);
});

// 7. Recurring Subscriptions (≥3 occurrences, similar amounts, monthly interval)
export const recurringTxnsData = computed(() => {
  const groups = new Map<string, Txn[]>();
  for (const t of txns.value) {
    if (t.amount >= 0 || t.flags.includes('ignored') || !t.merchant) continue;
    const list = groups.get(t.merchant) || [];
    list.push(t);
    groups.set(t.merchant, list);
  }

  const results: Array<{
    merchant: string;
    cadence: string;
    avgAmountPaise: Paise;
    count: number;
    txns: Txn[];
  }> = [];

  for (const [merchant, items] of groups.entries()) {
    if (items.length < 3) continue;

    // Sort by date ascending
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    const avgPaise = Math.round(
      items.reduce((acc, i) => acc + Math.abs(i.amount), 0) / items.length,
    ) as Paise;

    // Check if amounts are within 25% of average
    const consistent = items.every(
      (i) => Math.abs(Math.abs(i.amount) - avgPaise) / avgPaise < 0.25,
    );
    if (consistent) {
      results.push({
        merchant,
        cadence: 'Monthly',
        avgAmountPaise: avgPaise,
        count: items.length,
        txns: sorted,
      });
    }
  }

  return results;
});

// 8. Fees & Bank Charges
export const feeTxnsData = computed(() => {
  return txns.value.filter((t) => t.flags.includes('fee') || t.category.startsWith('fees:'));
});

// 9. Unusual Transactions (> 3x median and > ₹1,000 floor)
export const unusualTxnsData = computed(() => {
  const spends = txns.value.filter((t) => t.amount < 0 && !t.flags.includes('ignored'));
  if (spends.length < 5) return [];

  const amounts = spends.map((t) => Math.abs(t.amount)).sort((a, b) => a - b);
  const mid = Math.floor(amounts.length / 2);
  const medianPaise =
    amounts.length % 2 !== 0 ? amounts[mid] : (amounts[mid - 1] + amounts[mid]) / 2;

  const floorPaise = 1000 * 100; // ₹1,000 floor
  const thresholdPaise = Math.max(medianPaise * settings.value.unusualMultiplier, floorPaise);

  return spends.filter((t) => Math.abs(t.amount) > thresholdPaise);
});

// 10. Grouped Transactions Selector
export interface TxnGroup {
  key: string;
  label: string;
  sublabel?: string;
  txns: Txn[];
  totalIn: Paise;
  totalOut: Paise;
  net: Paise;
}

export const groupedTxns = computed<TxnGroup[]>(() => {
  const list = filteredTxns.value;
  const field = groupByField.value;

  if (field === 'none' || list.length === 0) {
    return [];
  }

  const map = new Map<string, { label: string; sublabel?: string; txns: Txn[] }>();
  const accountMap = new Map(accounts.value.map((a) => [a.id, `${a.bank} ••${a.last4}`]));
  const categoryMap = new Map(categoriesJson.map((c) => [c.id, c.name]));

  for (const t of list) {
    let key = '';
    let label = '';
    let sublabel: string | undefined;

    switch (field) {
      case 'date': {
        key = t.date;
        label = formatDisplayDate(t.date);
        break;
      }
      case 'month': {
        key = t.date.substring(0, 7);
        const [year, month] = key.split('-');
        const monthNames = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];
        const mIdx = Number.parseInt(month, 10) - 1;
        label = `${monthNames[mIdx] || month} ${year}`;
        break;
      }
      case 'category': {
        key = t.category;
        label = categoryMap.get(t.category) || t.category;
        if (t.category.includes(':')) {
          const parentKey = t.category.split(':')[0];
          sublabel = categoryMap.get(parentKey);
        }
        break;
      }
      case 'account': {
        key = t.accountId;
        label = accountMap.get(t.accountId) || t.accountId;
        break;
      }
      case 'merchant': {
        const canonical = t.merchant || getCanonicalMerchant(t.narration).merchantName;
        key = canonical || 'Other Payee';
        label = key;
        break;
      }
      case 'upi_app': {
        const app = resolveUpiApp(t.narration, t.ref, t.channel);
        key = app;
        label = app;
        break;
      }
      case 'counterparty_bank': {
        const bank = resolveCounterpartyBank(t.narration);
        key = bank;
        label = bank;
        break;
      }
      case 'statement': {
        key = t.statementId;
        label = `Statement Batch (${t.statementId.substring(0, 16)})`;
        break;
      }
    }

    if (!map.has(key)) {
      map.set(key, { label, sublabel, txns: [] });
    }
    map.get(key)!.txns.push(t);
  }

  const groups: TxnGroup[] = [];

  for (const [key, val] of map.entries()) {
    let totalIn = 0 as Paise;
    let totalOut = 0 as Paise;

    for (const t of val.txns) {
      if (t.amount > 0) {
        totalIn = (totalIn + t.amount) as Paise;
      } else {
        totalOut = (totalOut + Math.abs(t.amount)) as Paise;
      }
    }

    const net = (totalIn - totalOut) as Paise;

    groups.push({
      key,
      label: val.label,
      sublabel: val.sublabel,
      txns: val.txns,
      totalIn,
      totalOut,
      net,
    });
  }

  if (field === 'date' || field === 'month') {
    groups.sort((a, b) => b.key.localeCompare(a.key));
  } else if (field === 'category' || field === 'merchant') {
    groups.sort((a, b) => b.totalOut - a.totalOut);
  } else if (field === 'upi_app' || field === 'counterparty_bank') {
    groups.sort((a, b) => b.txns.length - a.txns.length);
  } else {
    groups.sort((a, b) => a.label.localeCompare(b.label));
  }

  return groups;
});
