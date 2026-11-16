import { describe, expect, it } from 'vitest';
import { iciciCardTemplate } from '../src/banks/icici-card';
import { detectBankTemplate } from '../src/pipeline/detect/detector';
import type { ExtractedDoc, TextItem } from '../src/pipeline/extract/types';
import { parseWithTemplate } from '../src/pipeline/parse/template-engine';

describe('ICICI Credit Card Statement Parsing', () => {
  it('detects and parses ICICI credit card statement with split text headers and masked card', () => {
    // Simulating a real PDF extraction where headers and entries are separate glyph text items
    const items: TextItem[] = [
      // Statement Header
      { text: 'ICICI Bank', x0: 50, x1: 120, y: 750, page: 1 },
      { text: 'Credit Card Statement', x0: 130, x1: 280, y: 750, page: 1 },
      { text: 'Primary Card No: 4315-XXXX-XXXX-8821', x0: 50, x1: 300, y: 720, page: 1 },
      { text: 'Billing Period: 16/10/2024 to 15/11/2024', x0: 50, x1: 320, y: 700, page: 1 },
      { text: 'Total Amount Due: 14,250.00', x0: 50, x1: 250, y: 680, page: 1 },
      { text: 'Payment Due Date: 05/12/2024', x0: 50, x1: 250, y: 660, page: 1 },

      // Table Header (simulating separate words in PDF)
      { text: 'Date', x0: 50, x1: 80, y: 600, page: 1 },
      { text: 'Transaction', x0: 120, x1: 180, y: 600, page: 1 },
      { text: 'Details', x0: 185, x1: 230, y: 600, page: 1 },
      { text: 'Ref', x0: 340, x1: 360, y: 600, page: 1 },
      { text: 'Number', x0: 365, x1: 410, y: 600, page: 1 },
      { text: 'Amount', x0: 450, x1: 490, y: 600, page: 1 },
      { text: '(INR)', x0: 495, x1: 530, y: 600, page: 1 },

      // Row 1: Purchase (expense)
      { text: '20/10/2024', x0: 50, x1: 110, y: 570, page: 1 },
      { text: 'AMAZON PAY INDIA', x0: 120, x1: 250, y: 570, page: 1 },
      { text: 'REF908123', x0: 340, x1: 410, y: 570, page: 1 },
      { text: '2,499.00', x0: 450, x1: 510, y: 570, page: 1 },

      // Row 2: Payment (credit)
      { text: '28/10/2024', x0: 50, x1: 110, y: 540, page: 1 },
      { text: 'AUTO DEBIT PAYMENT RECEIVED', x0: 120, x1: 310, y: 540, page: 1 },
      { text: 'REF908124', x0: 340, x1: 410, y: 540, page: 1 },
      { text: '10,000.00 CR', x0: 450, x1: 530, y: 540, page: 1 },

      // Row 3: Swiggy purchase with DR
      { text: '05/11/2024', x0: 50, x1: 110, y: 510, page: 1 },
      { text: 'SWIGGY BANGALORE', x0: 120, x1: 250, y: 510, page: 1 },
      { text: 'REF908125', x0: 340, x1: 410, y: 510, page: 1 },
      { text: '540.00 DR', x0: 450, x1: 520, y: 510, page: 1 },
    ];

    const doc: ExtractedDoc = {
      pages: 1,
      items,
      meta: { source: 'pdf', filenameHint: 'ICICI_Credit_Card_Nov2024.pdf' },
    };

    // 1. Detection
    const detection = detectBankTemplate(doc);
    expect(detection.template).not.toBeNull();
    expect(detection.template?.id).toBe('icici-card');
    expect(detection.confidence).toBeGreaterThanOrEqual(0.6);

    // 2. Parsing
    const parsed = parseWithTemplate(doc, iciciCardTemplate);
    expect(parsed.account.bank).toBe('ICICI');
    expect(parsed.account.product).toBe('card');
    expect(parsed.account.last4).toBe('8821');

    expect(parsed.statement.periodStart).toBe('2024-10-16');
    expect(parsed.statement.periodEnd).toBe('2024-11-15');

    // 3. Transactions
    expect(parsed.txns).toHaveLength(3);

    // Purchase 1: -2499.00 (-249900 paise)
    expect(parsed.txns[0].date).toBe('2024-10-20');
    expect(parsed.txns[0].narration).toContain('AMAZON PAY INDIA');
    expect(parsed.txns[0].amount).toBe(-249900);

    // Payment 2: +10000.00 (+1000000 paise)
    expect(parsed.txns[1].date).toBe('2024-10-28');
    expect(parsed.txns[1].narration).toContain('AUTO DEBIT PAYMENT RECEIVED');
    expect(parsed.txns[1].amount).toBe(1000000);

    // Purchase 3: -540.00 (-54000 paise)
    expect(parsed.txns[2].date).toBe('2024-11-05');
    expect(parsed.txns[2].narration).toContain('SWIGGY BANGALORE');
    expect(parsed.txns[2].amount).toBe(-54000);
  });
});
