import { Badge } from '@/components/ui/Badge';
import { formatPaise } from '@/lib/money';
import { accounts } from '@/store';
import type { Txn } from '@/types/models';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useState } from 'preact/hooks';
import { RowEditor } from '../review/RowEditor';

export function TransactionTable({ txns }: { txns: Txn[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [editingTxn, setEditingTxn] = useState<Txn | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: txns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  if (txns.length === 0) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground">
        No transactions match the selected filters or search query.
      </div>
    );
  }

  const accountMap = new Map(accounts.value.map((a) => [a.id, `${a.bank} ••${a.last4}`]));

  return (
    <>
      <div
        ref={parentRef}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Scrollable virtual container requires tabIndex for keyboard scrolling
        tabIndex={0}
        role="region"
        aria-label="Transactions table"
        className="h-[600px] w-full overflow-auto border border-border rounded-lg bg-card focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const t = txns[virtualRow.index];
            if (!t) return null;
            const isIgnored = t.flags.includes('ignored');

            return (
              <div
                key={t.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`flex items-center px-4 py-2 border-b border-border/60 hover:bg-muted/30 transition-colors text-xs select-none ${
                  isIgnored ? 'opacity-40 line-through bg-muted/10' : ''
                }`}
              >
                {/* Date */}
                <div className="w-24 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                  {t.date}
                </div>

                {/* Account badge */}
                <div className="w-24 hidden sm:block truncate pr-2">
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                    {accountMap.get(t.accountId) || 'Bank'}
                  </span>
                </div>

                {/* Description & Payee */}
                <div className="flex-1 truncate pr-3">
                  <div className="font-medium text-foreground truncate">{t.narration}</div>
                  {t.merchant && (
                    <div className="text-[10px] text-muted-foreground truncate">{t.merchant}</div>
                  )}
                </div>

                {/* Category */}
                <div className="w-32 hidden md:block whitespace-nowrap pr-2">
                  <Badge variant="secondary" className="text-[10px] truncate max-w-[120px]">
                    {t.category.split(':').pop()}
                  </Badge>
                </div>

                {/* Amount */}
                <div
                  className={`w-28 text-right font-mono font-medium whitespace-nowrap num pr-3 ${
                    t.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                  }`}
                >
                  {formatPaise(t.amount, { showSign: true })}
                </div>

                {/* Balance after */}
                <div className="w-24 text-right font-mono text-[11px] text-muted-foreground hidden lg:block whitespace-nowrap num pr-3">
                  {t.balanceAfter !== undefined ? formatPaise(t.balanceAfter) : '—'}
                </div>

                {/* Quick actions */}
                <div className="w-16 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setEditingTxn(t)}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-medium px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <RowEditor
        txn={editingTxn}
        isOpen={Boolean(editingTxn)}
        onClose={() => setEditingTxn(null)}
      />
    </>
  );
}
