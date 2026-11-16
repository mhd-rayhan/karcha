import { useState } from 'preact/hooks';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import categoriesJson from '@/data/categories.json';
import { paiseToRupees, toPaise } from '@/lib/money';
import { updateTxn } from '@/store';
import type { CategoryId, Paise } from '@/types/brands';
import type { Txn } from '@/types/models';

export function RowEditor({
  txn,
  isOpen,
  onClose,
}: {
  txn: Txn | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!txn) return null;

  const [date, setDate] = useState(txn.date);
  const [narration, setNarration] = useState(txn.narration);
  const [amountRupees, setAmountRupees] = useState(Math.abs(paiseToRupees(txn.amount)).toString());
  const [isCredit, setIsCredit] = useState(txn.amount > 0);
  const [category, setCategory] = useState<CategoryId>(txn.category);
  const [applyToSimilar, setApplyToSimilar] = useState(true);

  const handleSave = (e: Event) => {
    e.preventDefault();
    const parsedPaise = toPaise(Number(amountRupees));
    const finalAmount = (isCredit ? parsedPaise : -parsedPaise) as Paise;

    updateTxn(
      txn.id,
      {
        date: date as any,
        narration,
        amount: finalAmount,
        category,
        categorySource: 'manual',
      },
      applyToSimilar,
    );
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Transaction" description={`ID: ${txn.id}`}>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="edit-date" className="text-xs font-medium text-foreground">
              Date (YYYY-MM-DD)
            </label>
            <Input
              id="edit-date"
              type="text"
              value={date}
              onInput={(e: any) => setDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              required
            />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-foreground">Type</span>
            <div className="flex rounded-md border border-input p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => setIsCredit(false)}
                className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${
                  !isCredit ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                }`}
              >
                Withdrawal
              </button>
              <button
                type="button"
                onClick={() => setIsCredit(true)}
                className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${
                  isCredit ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                }`}
              >
                Deposit
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-amount" className="text-xs font-medium text-foreground">
            Amount (₹ Rupees)
          </label>
          <Input
            id="edit-amount"
            type="number"
            step="0.01"
            value={amountRupees}
            onInput={(e: any) => setAmountRupees(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-narration" className="text-xs font-medium text-foreground">
            Narration / Description
          </label>
          <Input
            id="edit-narration"
            type="text"
            value={narration}
            onInput={(e: any) => setNarration(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-category" className="text-xs font-medium text-foreground">
            Category
          </label>
          <Select
            id="edit-category"
            value={category}
            onChange={(e: any) => setCategory(e.target.value as CategoryId)}
          >
            {categoriesJson.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.parent ? `  ↳ ${cat.name}` : cat.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <input
            id="apply-similar"
            type="checkbox"
            checked={applyToSimilar}
            onChange={(e: any) => setApplyToSimilar(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
          />
          <label
            htmlFor="apply-similar"
            className="text-xs text-muted-foreground select-none cursor-pointer"
          >
            Apply category to similar transactions from &ldquo;{txn.merchant || 'this merchant'}
            &rdquo;
          </label>
        </div>

        <div className="flex justify-end space-x-2 pt-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
