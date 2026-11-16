import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { processExtractedDoc } from '@/pipeline';
import { detectBankTemplate } from '@/pipeline/detect/detector';
import { parseDelimitedText } from '@/pipeline/extract/csv-sniffer';

describe('Kotak Bank Statement Parser', () => {
  it('parses synthetic Kotak CSV with Dr/Cr column and verified tie-out', async () => {
    const fixturePath = path.resolve(__dirname, 'fixtures/kotak-sample.csv');
    const content = fs.readFileSync(fixturePath, 'utf-8');
    const doc = parseDelimitedText(content, 'kotak-sample.csv');

    // 1. Detect template
    const detection = detectBankTemplate(doc);
    expect(detection.template?.id).toBe('kotak-savings');
    expect(detection.confidence).toBeGreaterThanOrEqual(0.6);

    // 2. Process through pipeline
    const result = await processExtractedDoc(doc, [], []);

    // 3. Verify Account Metadata
    expect(result.account.bank).toBe('KOTAK');
    expect(result.account.product).toBe('savings');
    expect(result.account.last4).toBe('9452');

    // 4. Verify Statement Balances and Verification
    expect(result.statement.periodStart).toBe('2026-10-01');
    expect(result.statement.periodEnd).toBe('2026-10-31');
    expect(result.statement.opening).toBe(10000000); // ₹1,00,000.00 (derived: 75,000 - (-25,000))
    expect(result.statement.closing).toBe(12250000); // ₹1,22,500.00
    expect(result.statement.verification).toBe('verified');
    expect(result.statement.issues.filter((i) => i.severity === 'error')).toHaveLength(0);

    // 5. Verify Transactions
    expect(result.txns).toHaveLength(3);

    // Row 1: Debit ₹25,000
    expect(result.txns[0].date).toBe('2026-10-16');
    expect(result.txns[0].amount).toBe(-2500000);
    expect(result.txns[0].balanceAfter).toBe(7500000);
    expect(result.txns[0].narration).toContain('RENT PAYMENT');

    // Row 2: Debit ₹2,500
    expect(result.txns[1].date).toBe('2026-10-23');
    expect(result.txns[1].amount).toBe(-250000);
    expect(result.txns[1].balanceAfter).toBe(7250000);

    // Row 3: Credit ₹50,000
    expect(result.txns[2].date).toBe('2026-10-25');
    expect(result.txns[2].amount).toBe(5000000);
    expect(result.txns[2].balanceAfter).toBe(12250000);
  });
});
