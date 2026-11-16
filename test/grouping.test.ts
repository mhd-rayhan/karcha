import { accounts, groupByField, txns } from '@/store';
import { groupedTxns } from '@/store/selectors';
import type { IsoDate, Paise } from '@/types/brands';
import type { Txn } from '@/types/models';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Transaction Group By Selector', () => {
  const sampleTxns: Txn[] = [
    {
      id: 't-1',
      statementId: 'stmt-1',
      accountId: 'icici-savings-7098',
      date: '2024-01-15' as IsoDate,
      amount: -250000 as Paise, // -2500.00
      narration: 'UPI/401511223344/SWIGGY/swiggy@icici/YES BANK/UPI',
      merchant: 'Swiggy',
      ref: 'swiggy@icici',
      channel: 'upi',
      category: 'food:delivery' as any,
      categorySource: 'bundled',
      flags: [],
      source: { page: 1, line: 1 },
    },
    {
      id: 't-2',
      statementId: 'stmt-1',
      accountId: 'icici-savings-7098',
      date: '2024-01-15' as IsoDate,
      amount: 500000 as Paise, // +5000.00
      narration: 'NEFT CR-HDFC0001234-TECH CORP-SALARY',
      channel: 'neft',
      category: 'income:salary' as any,
      categorySource: 'bundled',
      flags: [],
      source: { page: 1, line: 2 },
    },
    {
      id: 't-3',
      statementId: 'stmt-2',
      accountId: 'hdfc-savings-1234',
      date: '2024-02-10' as IsoDate,
      amount: -120000 as Paise, // -1200.00
      narration: 'UPI/402511223344/BLINKIT/blink@ybl/KOTAK MAHINDRA/UPI',
      merchant: 'Blinkit',
      ref: 'blink@ybl',
      channel: 'upi',
      category: 'food:groceries' as any,
      categorySource: 'bundled',
      flags: [],
      source: { page: 1, line: 3 },
    },
  ];

  beforeEach(() => {
    txns.value = sampleTxns;
    accounts.value = [
      { id: 'icici-savings-7098', bank: 'ICICI' as any, product: 'savings', last4: '7098' },
      { id: 'hdfc-savings-1234', bank: 'HDFC' as any, product: 'savings', last4: '1234' },
    ];
    groupByField.value = 'none';
  });

  it('returns empty array when groupByField is none', () => {
    groupByField.value = 'none';
    expect(groupedTxns.value).toHaveLength(0);
  });

  it('correctly groups transactions by date', () => {
    groupByField.value = 'date';
    const groups = groupedTxns.value;

    expect(groups).toHaveLength(2); // 2024-02-10 and 2024-01-15

    const jan15 = groups.find((g) => g.key === '2024-01-15');
    expect(jan15).toBeDefined();
    expect(jan15?.txns).toHaveLength(2);
    expect(jan15?.totalOut).toBe(250000);
    expect(jan15?.totalIn).toBe(500000);
    expect(jan15?.net).toBe(250000); // 5000 - 2500 = +2500

    const feb10 = groups.find((g) => g.key === '2024-02-10');
    expect(feb10).toBeDefined();
    expect(feb10?.txns).toHaveLength(1);
    expect(feb10?.totalOut).toBe(120000);
    expect(feb10?.totalIn).toBe(0);
    expect(feb10?.net).toBe(-120000);
  });

  it('correctly groups transactions by month', () => {
    groupByField.value = 'month';
    const groups = groupedTxns.value;

    expect(groups).toHaveLength(2); // 2024-02 and 2024-01

    const feb = groups.find((g) => g.key === '2024-02');
    expect(feb).toBeDefined();
    expect(feb?.label).toBe('February 2024');
    expect(feb?.txns).toHaveLength(1);

    const jan = groups.find((g) => g.key === '2024-01');
    expect(jan).toBeDefined();
    expect(jan?.label).toBe('January 2024');
    expect(jan?.txns).toHaveLength(2);
  });

  it('correctly groups transactions by category', () => {
    groupByField.value = 'category';
    const groups = groupedTxns.value;

    expect(groups.length).toBeGreaterThanOrEqual(2);
    // Categorical groups are sorted by spend descending
    expect(groups[0].totalOut).toBeGreaterThanOrEqual(groups[1].totalOut);
  });

  it('correctly groups transactions by account', () => {
    groupByField.value = 'account';
    const groups = groupedTxns.value;

    expect(groups).toHaveLength(2);
    const iciciGroup = groups.find((g) => g.key === 'icici-savings-7098');
    expect(iciciGroup).toBeDefined();
    expect(iciciGroup?.label).toBe('ICICI ••7098');
    expect(iciciGroup?.txns).toHaveLength(2);

    const hdfcGroup = groups.find((g) => g.key === 'hdfc-savings-1234');
    expect(hdfcGroup).toBeDefined();
    expect(hdfcGroup?.label).toBe('HDFC ••1234');
    expect(hdfcGroup?.txns).toHaveLength(1);
  });

  it('correctly groups transactions by statement batch', () => {
    groupByField.value = 'statement';
    const groups = groupedTxns.value;

    expect(groups).toHaveLength(2);
    const stmt1 = groups.find((g) => g.key === 'stmt-1');
    expect(stmt1).toBeDefined();
    expect(stmt1?.txns).toHaveLength(2);
  });

  it('correctly groups transactions by merchant with spend-based sorting', () => {
    groupByField.value = 'merchant';
    const groups = groupedTxns.value;

    expect(groups.length).toBeGreaterThanOrEqual(2);
    // Highest spend first: Swiggy (₹2,500) > Blinkit (₹1,200)
    const swiggy = groups.find((g) => g.label === 'Swiggy');
    expect(swiggy).toBeDefined();
    expect(swiggy?.totalOut).toBe(250000);

    const blinkit = groups.find((g) => g.label === 'Blinkit');
    expect(blinkit).toBeDefined();
    expect(blinkit?.totalOut).toBe(120000);

    expect(groups[0].totalOut).toBeGreaterThanOrEqual(groups[1].totalOut);
  });

  it('correctly groups transactions by UPI app / payment channel', () => {
    groupByField.value = 'upi_app';
    const groups = groupedTxns.value;

    expect(groups.length).toBeGreaterThanOrEqual(2);
    const phonePe = groups.find((g) => g.key === 'PhonePe');
    expect(phonePe).toBeDefined();
    expect(phonePe?.txns).toHaveLength(1);

    const neft = groups.find((g) => g.key === 'NEFT / RTGS Transfer');
    expect(neft).toBeDefined();
    expect(neft?.txns).toHaveLength(1);
  });

  it('correctly groups transactions by counterparty bank', () => {
    groupByField.value = 'counterparty_bank';
    const groups = groupedTxns.value;

    expect(groups.length).toBeGreaterThanOrEqual(2);
    const yesBank = groups.find((g) => g.key === 'Yes Bank');
    expect(yesBank).toBeDefined();

    const kotakBank = groups.find((g) => g.key === 'Kotak Mahindra Bank');
    expect(kotakBank).toBeDefined();
  });
});
