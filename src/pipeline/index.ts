import { toIsoDate } from '@/lib/dates';
import type { Account, Rule, Statement, Txn } from '@/types/models';
import { categoriseTxn } from './categorise/categoriser';
import { assignDeterministicTxnIds } from './dedup/dedup';
import { detectBankTemplate } from './detect/detector';
import type { ExtractedDoc } from './extract/types';
import { parseGenericStatement } from './parse/generic-parser';
import { parseWithTemplate } from './parse/template-engine';
import { detectTransfers } from './transfers/matcher';
import { validateStatement } from './validate/validators';

export interface ProcessedStatementResult {
  account: Account;
  statement: Statement;
  txns: Txn[];
}

export async function processExtractedDoc(
  doc: ExtractedDoc,
  activeRules: Rule[],
  existingTxns: Txn[] = [],
): Promise<ProcessedStatementResult> {
  const statementId = `stmt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Check for scanned / raster image PDF with zero extractable text (spec §5.6 NO_TEXT)
  if (doc.pages > 0 && doc.items.length === 0) {
    return {
      account: {
        id: 'scanned-document-XXXX',
        bank: 'Unknown' as any,
        product: 'savings',
        last4: 'XXXX',
      },
      statement: {
        id: statementId,
        accountId: 'scanned-document-XXXX',
        periodStart: toIsoDate('2024-01-01')!,
        periodEnd: toIsoDate('2024-12-31')!,
        verification: 'cannot-verify',
        issues: [
          {
            code: 'NO_TEXT',
            severity: 'error',
            message:
              'This PDF appears to be a scanned image or photograph with no digital text layer. Kharcha runs 100% locally in your browser without cloud OCR. Please download the official digital e-statement from your bank netbanking portal.',
          },
        ],
        parser: {
          id: 'scanned-pdf-detector',
          version: '1.0',
          layoutFingerprint: 'scanned-no-text',
        },
        importedAt: Date.now(),
      },
      txns: [],
    };
  }

  // 1. Detect Bank Template
  const detection = detectBankTemplate(doc);
  const parseResult = detection.template
    ? parseWithTemplate(doc, detection.template)
    : parseGenericStatement(doc);

  const accountId = parseResult.statement.accountId;

  // 2. Assign deterministic IDs
  const rawTxnInputs = parseResult.txns.map((t) => ({
    ...t,
    accountId,
    statementId,
    amount: t.amount,
  }));

  const withIds = await assignDeterministicTxnIds(rawTxnInputs);

  // 3. Categorise each transaction
  const categorisedTxns: Txn[] = withIds.map((t) => {
    const cat = categoriseTxn(t.narration, t.amount, activeRules);
    return {
      ...t,
      merchant: cat.merchant,
      category: cat.category,
      categoryRuleId: cat.categoryRuleId,
      categorySource: cat.categorySource,
      flags: cat.flags,
    };
  });

  // 4. Validate statement (tie-out & balance chain)
  const validation = validateStatement({
    statement: parseResult.statement,
    txns: categorisedTxns,
  });

  // Combine parser issues and validation issues
  const allIssues = [...parseResult.issues, ...validation.issues];

  // 5. Transfer detection (cross-account)
  const allTxnsForTransfers = [...existingTxns, ...categorisedTxns];
  const transferMatches = detectTransfers(allTxnsForTransfers);
  const transferTxnIds = new Set<string>();
  for (const m of transferMatches) {
    if (m.score >= 0.7) {
      transferTxnIds.add(m.debitTxnId);
      transferTxnIds.add(m.creditTxnId);
    }
  }

  // Apply transfer flags and transfer category if matched
  for (const t of categorisedTxns) {
    if (transferTxnIds.has(t.id)) {
      if (!t.flags.includes('transfer')) t.flags.push('transfer');
      t.category = 'transfers:self' as any;
      t.categorySource = 'bundled';
    }
  }

  const statement: Statement = {
    ...parseResult.statement,
    id: statementId,
    accountId,
    verification: validation.verification,
    issues: allIssues,
    importedAt: Date.now(),
  };

  const account: Account = {
    id: accountId,
    bank: parseResult.account.bank,
    product: parseResult.account.product,
    last4: parseResult.account.last4,
  };

  return {
    account,
    statement,
    txns: categorisedTxns,
  };
}
