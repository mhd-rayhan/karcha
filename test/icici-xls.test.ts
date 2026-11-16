import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { processExtractedDoc } from '../src/pipeline';
import { detectBankTemplate } from '../src/pipeline/detect/detector';
import { parseExcelWorkbook } from '../src/pipeline/extract/excel-parser';

describe('ICICI Savings XLS Real Export', () => {
  const fixturePath = path.resolve(__dirname, 'fixtures/OpTransactionHistory12-11-2026.xls');

  it('correctly extracts, detects, and parses ICICI Netbanking XLS statement', async () => {
    const fileBuf = fs.readFileSync(fixturePath);
    const arrayBuffer = fileBuf.buffer.slice(
      fileBuf.byteOffset,
      fileBuf.byteOffset + fileBuf.byteLength,
    );

    // 1. Extraction
    const doc = parseExcelWorkbook(arrayBuffer, 'OpTransactionHistory12-11-2026.xls');
    expect(doc.items.length).toBeGreaterThan(50);
    expect(doc.meta.source).toBe('excel');

    // 2. Detection
    const detection = detectBankTemplate(doc);
    expect(detection.template).not.toBeNull();
    expect(detection.template?.id).toBe('icici-savings');
    expect(detection.confidence).toBeGreaterThanOrEqual(0.6);

    // 3. Processing Pipeline
    const result = await processExtractedDoc(doc, [], []);

    // Account verification
    expect(result.account.bank).toBe('ICICI');
    expect(result.account.product).toBe('savings');
    expect(result.account.last4).toBe('7098');

    // Statement verification
    expect(result.statement.parser.id).toBe('icici-savings');
    expect(result.statement.periodStart).toBe('2025-11-12');
    expect(result.statement.periodEnd).toBe('2026-11-11');

    // Transactions verification
    expect(result.txns).toHaveLength(6);

    // Txn 1: 12/11/2025, Withdrawal 2500, Balance 88909.56
    expect(result.txns[0].date).toBe('2025-11-12');
    expect(result.txns[0].amount).toBe(-250000);
    expect(result.txns[0].balanceAfter).toBe(8890956);
    expect(result.txns[0].narration).toContain('ICICI/UPI');

    // Txn 2: 12/11/2025, Deposit 2, Balance 88911.56
    expect(result.txns[1].date).toBe('2025-11-12');
    expect(result.txns[1].amount).toBe(200);
    expect(result.txns[1].balanceAfter).toBe(8891156);

    // Txn 3: 12/11/2025, Deposit 3, Balance 88914.56
    expect(result.txns[2].date).toBe('2025-11-12');
    expect(result.txns[2].amount).toBe(300);
    expect(result.txns[2].balanceAfter).toBe(8891456);

    // Txn 4: 07/11/2026, Deposit 600, Balance 243570.77
    expect(result.txns[3].date).toBe('2026-11-07');
    expect(result.txns[3].amount).toBe(60000);
    expect(result.txns[3].balanceAfter).toBe(24357077);

    // Txn 5: 10/11/2026, Deposit 8000, Balance 251570.77
    expect(result.txns[4].date).toBe('2026-11-10');
    expect(result.txns[4].amount).toBe(800000);
    expect(result.txns[4].balanceAfter).toBe(25157077);

    // Txn 6: 11/11/2026, Deposit 10000, Balance 261570.77
    expect(result.txns[5].date).toBe('2026-11-11');
    expect(result.txns[5].amount).toBe(1000000);
    expect(result.txns[5].balanceAfter).toBe(26157077);

    // Balance chain gap verification (trimmed statement)
    const balIssue = result.statement.issues.find((i) => i.code === 'BAL_CHAIN');
    expect(balIssue).toBeDefined();
    expect(balIssue?.diffPaise).toBe(15405621);
    expect(result.statement.verification).toBe('needs-review');
  });
});
