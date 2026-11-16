import { Badge } from '@/components/ui/Badge';
import { formatPaise } from '@/lib/money';
import { accounts, groupByField } from '@/store';
import type { TxnGroup } from '@/store/selectors';
import type { Txn } from '@/types/models';
import { useState } from 'preact/hooks';
import { RowEditor } from '../review/RowEditor';

export interface GroupedTransactionListProps {
  groups: TxnGroup[];
}

export function GroupedTransactionList({ groups }: GroupedTransactionListProps) {
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const [editingTxn, setEditingTxn] = useState<Txn | null>(null);

  const toggleGroup = (key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedKeys(new Set());
  const collapseAll = () => setCollapsedKeys(new Set(groups.map((g) => g.key)));

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground">
        No transactions match the selected filters.
      </div>
    );
  }

  const accountMap = new Map(accounts.value.map((a) => [a.id, `${a.bank} ••${a.last4}`]));
  const allCollapsed = groups.every((g) => collapsedKeys.has(g.key));

  return (
    <div className="space-y-3">
      {/* Group Controls Bar */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-muted-foreground">
          Showing <strong className="text-foreground">{groups.length}</strong> groups
        </span>

        <div className="flex items-center space-x-2">
          {allCollapsed ? (
            <button
              type="button"
              onClick={expandAll}
              className="text-primary hover:underline font-medium cursor-pointer"
            >
              Expand All
            </button>
          ) : (
            <button
              type="button"
              onClick={collapseAll}
              className="text-primary hover:underline font-medium cursor-pointer"
            >
              Collapse All
            </button>
          )}
        </div>
      </div>

      {/* Groups List */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isCollapsed = collapsedKeys.has(group.key);

          return (
            <div
              key={group.key}
              className="border border-border rounded-xl bg-card overflow-hidden shadow-xs transition-shadow"
            >
              {/* Group Header Button */}
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left border-b border-border/40 gap-2 cursor-pointer"
              >
                {/* Left: Title & Count */}
                <div className="flex items-center space-x-2.5 min-w-0">
                  <svg
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
                      isCollapsed ? '-rotate-90' : 'rotate-0'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {group.label}
                      </span>
                      <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        {group.txns.length}
                      </span>
                    </div>
                    {group.sublabel && (
                      <span className="text-[11px] text-muted-foreground block truncate">
                        {group.sublabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Subtotal Summary Pills */}
                <div className="flex items-center space-x-3 text-xs font-mono self-end sm:self-auto">
                  {group.totalOut > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground mr-1 hidden md:inline">
                        Out:
                      </span>
                      <span className="text-foreground font-medium">
                        -{formatPaise(group.totalOut)}
                      </span>
                    </div>
                  )}

                  {group.totalIn > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground mr-1 hidden md:inline">
                        In:
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        +{formatPaise(group.totalIn)}
                      </span>
                    </div>
                  )}

                  <div className="text-right border-l border-border/60 pl-3">
                    <span className="text-[10px] text-muted-foreground mr-1 hidden md:inline">
                      Net:
                    </span>
                    <span
                      className={`font-semibold ${
                        group.net >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'
                      }`}
                    >
                      {formatPaise(group.net, { showSign: true })}
                    </span>
                  </div>
                </div>
              </button>

              {/* Group Body: Transaction Rows */}
              {!isCollapsed && (
                <div className="divide-y divide-border/40">
                  {group.txns.map((t) => {
                    const isIgnored = t.flags.includes('ignored');

                    return (
                      <div
                        key={t.id}
                        className={`flex items-center px-4 py-2.5 hover:bg-muted/30 transition-colors text-xs select-none ${
                          isIgnored ? 'opacity-40 line-through bg-muted/10' : ''
                        }`}
                      >
                        {/* Date */}
                        <div className="w-24 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {t.date}
                        </div>

                        {/* Account badge (hidden when grouping by account) */}
                        {groupByField.value !== 'account' && (
                          <div className="w-24 hidden sm:block truncate pr-2">
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                              {accountMap.get(t.accountId) || 'Bank'}
                            </span>
                          </div>
                        )}

                        {/* Description & Payee */}
                        <div className="flex-1 truncate pr-3">
                          <div className="font-medium text-foreground truncate">{t.narration}</div>
                          {t.merchant && groupByField.value !== 'merchant' && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              {t.merchant}
                            </div>
                          )}
                        </div>

                        {/* Category (hidden when grouping by category) */}
                        {groupByField.value !== 'category' && (
                          <div className="w-32 hidden md:block whitespace-nowrap pr-2">
                            <Badge
                              variant="secondary"
                              className="text-[10px] truncate max-w-[120px]"
                            >
                              {t.category.split(':').pop()}
                            </Badge>
                          </div>
                        )}

                        {/* Amount */}
                        <div
                          className={`w-28 text-right font-mono font-medium whitespace-nowrap num pr-3 ${
                            t.amount >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-foreground'
                          }`}
                        >
                          {formatPaise(t.amount, { showSign: true })}
                        </div>

                        {/* Balance after */}
                        <div className="w-24 text-right font-mono text-[11px] text-muted-foreground hidden lg:block whitespace-nowrap num pr-3">
                          {t.balanceAfter !== undefined ? formatPaise(t.balanceAfter) : '—'}
                        </div>

                        {/* Actions */}
                        <div className="w-16 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditingTxn(t)}
                            className="text-[11px] text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded hover:bg-muted transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Row Editor Modal */}
      <RowEditor
        txn={editingTxn}
        isOpen={Boolean(editingTxn)}
        onClose={() => setEditingTxn(null)}
      />
    </div>
  );
}
