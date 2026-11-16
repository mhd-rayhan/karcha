import type { Statement, Txn } from '@/types/models';

export interface RedactedDiagnostics {
  schemaVersion: 1;
  timestamp: string;
  parser: {
    id: string;
    version: string;
    layoutFingerprint: string;
  };
  stats: {
    transactionCount: number;
    pagesCount: number;
    dateSpanDays: number;
    creditCount: number;
    debitCount: number;
  };
  verification: string;
  issueCodes: string[];
}

export function generateRedactedDiagnostics(statement: Statement, txns: Txn[]): string {
  const statementTxns = txns.filter((t) => t.statementId === statement.id);

  let maxPage = 1;
  for (const t of statementTxns) {
    if (t.source.page > maxPage) maxPage = t.source.page;
  }

  const d1 = new Date(statement.periodStart).getTime();
  const d2 = new Date(statement.periodEnd).getTime();
  const dateSpanDays = Math.max(1, Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)));

  const diagnostics: RedactedDiagnostics = {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    parser: statement.parser,
    stats: {
      transactionCount: statementTxns.length,
      pagesCount: maxPage,
      dateSpanDays,
      creditCount: statementTxns.filter((t) => t.amount > 0).length,
      debitCount: statementTxns.filter((t) => t.amount < 0).length,
    },
    verification: statement.verification,
    issueCodes: statement.issues.map((i) => i.code),
  };

  return JSON.stringify(diagnostics, null, 2);
}
