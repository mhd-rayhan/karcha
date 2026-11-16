import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDisplayDate } from '@/lib/dates';
import { formatPaise } from '@/lib/money';
import {
  accounts,
  deleteStatement,
  selectedStatementId,
  statements,
  toggleTxnFlag,
  txns,
} from '@/store';
import type { Txn } from '@/types/models';
import { useState } from 'preact/hooks';
import { RowEditor } from './RowEditor';
import { TieOutBanner } from './TieOutBanner';

export function ReviewView() {
  const [editingTxn, setEditingTxn] = useState<Txn | null>(null);

  const stmtList = statements.value;
  const currentStmt = stmtList.find((s) => s.id === selectedStatementId.value) || stmtList[0];

  if (!currentStmt) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-4">
        <h3 className="text-base font-semibold text-foreground">No Statement Selected</h3>
        <p className="text-xs text-muted-foreground">
          Import a bank statement to review transactions and tie-out.
        </p>
      </div>
    );
  }

  const stmtTxns = txns.value.filter((t) => t.statementId === currentStmt.id);
  const account = accounts.value.find((a) => a.id === currentStmt.accountId);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6 animate-fade-in">
      {/* Header & Statement Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Statement Review</h1>
            <Badge variant="outline" className="font-mono uppercase text-[11px]">
              {account?.bank || 'Bank'} •••• {account?.last4 || 'XXXX'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Period: {formatDisplayDate(currentStmt.periodStart)} to{' '}
            {formatDisplayDate(currentStmt.periodEnd)} • {stmtTxns.length} transactions
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {stmtList.length > 1 && (
            <select
              value={currentStmt.id}
              onChange={(e: any) => (selectedStatementId.value = e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-xs"
            >
              {stmtList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.accountId} ({s.periodStart})
                </option>
              ))}
            </select>
          )}

          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm('Are you sure you want to remove this statement?')) {
                deleteStatement(currentStmt.id);
              }
            }}
          >
            Remove Statement
          </Button>
        </div>
      </div>

      {/* Tie Out Mathematical Banner */}
      <TieOutBanner statement={currentStmt} txns={txns.value} />

      {/* Issues List */}
      {currentStmt.issues.length > 0 && (
        <Card className="p-4 border-amber-500/20 bg-amber-500/5 space-y-2">
          <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-100 flex items-center space-x-1.5">
            <span>⚠ Parser & Validation Notes ({currentStmt.issues.length})</span>
          </h4>
          <ul className="divide-y divide-border/40 text-xs">
            {currentStmt.issues.map((issue, idx) => (
              <li
                key={`${issue.code}-${issue.message}-${idx}`}
                className="py-1.5 flex items-start space-x-2"
              >
                <span className="font-mono text-[10px] text-muted-foreground uppercase px-1.5 py-0.5 rounded bg-muted/60">
                  {issue.code}
                </span>
                <span className="text-foreground">{issue.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Transaction Review Table */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Statement Rows ({stmtTxns.length})
          </h3>
          <span className="text-[11px] text-muted-foreground">
            Click Edit to modify date, amount or narration
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-medium">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Description / Payee</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-right">Running Balance</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stmtTxns.map((t) => {
                const isIgnored = t.flags.includes('ignored');
                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      isIgnored ? 'opacity-40 line-through bg-muted/10' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap text-muted-foreground">
                      {t.date}
                    </td>
                    <td className="py-2.5 px-3 max-w-xs sm:max-w-md truncate">
                      <div className="font-medium text-foreground truncate">{t.narration}</div>
                      {t.merchant && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          {t.merchant}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Badge variant="secondary" className="text-[11px]">
                        {t.category}
                      </Badge>
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-medium whitespace-nowrap num ${
                        t.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                      }`}
                    >
                      {formatPaise(t.amount, { showSign: true })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground whitespace-nowrap num">
                      {t.balanceAfter !== undefined ? formatPaise(t.balanceAfter) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => setEditingTxn(t)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-muted-foreground"
                        onClick={() => toggleTxnFlag(t.id, 'ignored')}
                      >
                        {isIgnored ? 'Restore' : 'Ignore'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inline Row Editor Modal */}
      <RowEditor
        txn={editingTxn}
        isOpen={Boolean(editingTxn)}
        onClose={() => setEditingTxn(null)}
      />
    </div>
  );
}
