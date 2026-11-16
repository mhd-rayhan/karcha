import { describe, expect, it } from 'vitest';
import { categoriseTxn } from '@/pipeline/categorise/categoriser';
import { parseNarration } from '@/pipeline/categorise/merchant';
import type { Paise } from '@/types/brands';

describe('Expanded Indian Financial Categorisation', () => {
  it('correctly categorises food delivery and quick commerce', () => {
    const swiggy = categoriseTxn('UPI/Swiggy/swiggy@icici/Order123', -45000 as Paise, []);
    expect(swiggy.category).toBe('food:delivery');
    expect(swiggy.merchant).toBe('Swiggy');

    const blinkit = categoriseTxn('POS 401293 BLINKIT COMMERCE GURGAON', -32000 as Paise, []);
    expect(blinkit.category).toBe('food:groceries');
    expect(blinkit.merchant).toBe('Blinkit');

    const zepto = categoriseTxn('UPI/Zepto/zepto@hdfcbank/Groceries', -25000 as Paise, []);
    expect(zepto.category).toBe('food:groceries');
    expect(zepto.merchant).toBe('Zepto');
  });

  it('correctly categorises transit, railways and airlines', () => {
    const irctc = categoriseTxn('IRCTC TICKETING MUMBAI IND', -125000 as Paise, []);
    expect(irctc.category).toBe('transport:trains');
    expect(irctc.merchant).toBe('IRCTC Indian Railways');

    const dmrc = categoriseTxn('UPI/DMRC Metro Smart Card/dmrc@sbi/Recharge', -20000 as Paise, []);
    expect(dmrc.category).toBe('transport:transit');
    expect(dmrc.merchant).toBe('Delhi Metro (DMRC)');

    const indigo = categoriseTxn('INDIGO AIRLINES GURGAON IND', -450000 as Paise, []);
    expect(indigo.category).toBe('transport:flights');
    expect(indigo.merchant).toBe('IndiGo Airlines');
  });

  it('correctly categorises DISCOMs and utility bills', () => {
    const bescom = categoriseTxn('BILLDESK BESCOM POWER BANGALORE', -180000 as Paise, []);
    expect(bescom.category).toBe('bills:electricity');
    expect(bescom.merchant).toBe('BESCOM Bangalore Electricity');

    const igl = categoriseTxn('IGL PIPED GAS BILL PAYMENT', -95000 as Paise, []);
    expect(igl.category).toBe('bills:water_gas');
    expect(igl.merchant).toBe('Indraprastha Gas (IGL)');
  });

  it('correctly categorises healthcare, labs and pharmacies', () => {
    const apollo = categoriseTxn('APOLLO PHARMACY BANGALORE IND', -54000 as Paise, []);
    expect(apollo.category).toBe('health:pharmacy');
    expect(apollo.merchant).toBe('Apollo Pharmacy');

    const lalPath = categoriseTxn('DR LAL PATHLABS LAB TEST BLOOD', -120000 as Paise, []);
    expect(lalPath.category).toBe('health:diagnostics');
    expect(lalPath.merchant).toBe('Dr Lal PathLabs');
  });

  it('correctly categorises wealth, investments and government taxes', () => {
    const zerodha = categoriseTxn('ACH/ZERODHA BROKING/FUNDS', -5000000 as Paise, []);
    expect(zerodha.category).toBe('investments:stocks');
    expect(zerodha.merchant).toBe('Zerodha');

    const groww = categoriseTxn('GROWW INVEST TECH SIP', -500000 as Paise, []);
    expect(groww.category).toBe('investments:stocks');
    expect(groww.merchant).toBe('Groww');

    const tax = categoriseTxn('INCOME TAX ADVANCE TAX CHAL 280', -2500000 as Paise, []);
    expect(tax.category).toBe('government:taxes');
    expect(tax.merchant).toBe('Income Tax Department');
  });

  it('correctly categorises credit card bill payments via CRED', () => {
    const cred = categoriseTxn('UPI/CRED/credclub@axisbank/CC Payment', -3500000 as Paise, []);
    expect(cred.category).toBe('transfers:card_payment');
    expect(cred.merchant).toBe('CRED Credit Card Bill Payment');
  });

  it('parses ICICI 6-part UPI narration strings cleanly', () => {
    const narration =
      'UPI/SAMPLE MERCHANT/merchant@okhdfcbank/DINING/HDFC BANK/101951777968/HDF26FB70F0412B4B649D334F1699C8EBDB';
    const parsed = parseNarration(narration);
    expect(parsed.channel).toBe('upi');
    expect(parsed.payee).toBe('SAMPLE MERCHANT');
    expect(parsed.vpa).toBe('merchant@okhdfcbank');
    expect(parsed.ref).toBe('101951777968');
  });
});
