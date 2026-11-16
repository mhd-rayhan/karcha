import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { processExtractedDoc } from '@/pipeline';
import { detectBankTemplate } from '@/pipeline/detect/detector';
import { parseDelimitedText } from '@/pipeline/extract/csv-sniffer';
import { detectTransfers } from '@/pipeline/transfers/matcher';

describe('HDFC Bank Statement Parser', () => {
  it('parses synthetic HDFC TXT fixed-width report with verified tie-out', async () => {
    const fixturePath = path.resolve(__dirname, 'fixtures/hdfc-sample.txt');
    const content = fs.readFileSync(fixturePath, 'utf-8');
    const doc = parseDelimitedText(content, 'hdfc-sample.txt');

    // 1. Detect template
    const detection = detectBankTemplate(doc);
    expect(detection.template?.id).toBe('hdfc-savings');
    expect(detection.confidence).toBeGreaterThanOrEqual(0.6);

    // 2. Process through pipeline
    const result = await processExtractedDoc(doc, [], []);

    // 3. Verify Account Metadata
    expect(result.account.bank).toBe('HDFC');
    expect(result.account.product).toBe('savings');
    expect(result.account.last4).toBe('3254');

    // 4. Verify Statement Balances and Verification
    expect(result.statement.periodStart).toBe('2026-10-01');
    expect(result.statement.periodEnd).toBe('2026-10-31');
    expect(result.statement.opening).toBe(10000000); // ₹1,00,000.00
    expect(result.statement.closing).toBe(12000000); // ₹1,20,000.00
    expect(result.statement.verification).toBe('verified');
    expect(result.statement.issues.filter((i) => i.severity === 'error')).toHaveLength(0);

    // 5. Verify Transactions
    expect(result.txns).toHaveLength(3);

    // Row 1: Debit ₹1,500 with multi-line narration
    expect(result.txns[0].date).toBe('2026-10-03');
    expect(result.txns[0].amount).toBe(-150000);
    expect(result.txns[0].balanceAfter).toBe(9850000);
    expect(result.txns[0].narration).toContain('ORDER ITEM 4421');

    // Row 2: Credit ₹25,000 (Inter-account transfer)
    expect(result.txns[1].date).toBe('2026-10-16');
    expect(result.txns[1].amount).toBe(2500000);
    expect(result.txns[1].balanceAfter).toBe(12350000);

    // Row 3: Debit ₹3,500 with multi-line narration
    expect(result.txns[2].date).toBe('2026-10-27');
    expect(result.txns[2].amount).toBe(-350000);
    expect(result.txns[2].balanceAfter).toBe(12000000);
    expect(result.txns[2].narration).toContain('CONSUMER ID 883921');
  });

  it('matches inter-account transfer between Kotak and HDFC', async () => {
    const kotakDoc = parseDelimitedText(
      fs.readFileSync(path.resolve(__dirname, 'fixtures/kotak-sample.csv'), 'utf-8'),
      'kotak-sample.csv',
    );
    const hdfcDoc = parseDelimitedText(
      fs.readFileSync(path.resolve(__dirname, 'fixtures/hdfc-sample.txt'), 'utf-8'),
      'hdfc-sample.txt',
    );

    const kotakRes = await processExtractedDoc(kotakDoc, [], []);
    const hdfcRes = await processExtractedDoc(hdfcDoc, [], []);

    const allTxns = [...kotakRes.txns, ...hdfcRes.txns];
    const matches = detectTransfers(allTxns);

    expect(matches.length).toBeGreaterThanOrEqual(1);
    const rentOrTransferMatch = matches.find((m) => {
      const debitTxn = allTxns.find((t) => t.id === m.debitTxnId);
      const creditTxn = allTxns.find((t) => t.id === m.creditTxnId);
      return Math.abs(debitTxn?.amount || 0) === 2500000 && creditTxn?.amount === 2500000;
    });

    expect(rentOrTransferMatch).toBeDefined();
    expect(rentOrTransferMatch?.score).toBeGreaterThanOrEqual(0.7);
  });
});
