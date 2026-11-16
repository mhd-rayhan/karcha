import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import categoriesJson from '@/data/categories.json';
import { downloadFile, exportTransactionsToCsv, exportTransactionsToJson } from '@/lib/export';
import {
  accounts,
  filterAccountId,
  filterCategory,
  filterDirection,
  type GroupByField,
  groupByField,
  searchQuery,
  sortAsc,
  sortField,
  txns,
} from '@/store';
import { filteredTxns, groupedTxns } from '@/store/selectors';
import type { CategoryId } from '@/types/brands';
import { GroupedTransactionList } from './GroupedTransactionList';
import { TransactionTable } from './TransactionTable';

export function TransactionsView() {
  const list = filteredTxns.value;
  const groups = groupedTxns.value;

  const handleExportCsv = () => {
    const csv = exportTransactionsToCsv(list);
    downloadFile(csv, `kharcha_export_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportJson = () => {
    const json = exportTransactionsToJson(list);
    downloadFile(json, `kharcha_export_${Date.now()}.json`, 'application/json');
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-4 animate-fade-in">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Transactions</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Showing {list.length} of {txns.value.length} total transactions
            {groupByField.value !== 'none' && ` across ${groups.length} groups`}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={list.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            disabled={list.length === 0}
          >
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-3.5 space-y-3 border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search query */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Input
              type="search"
              placeholder="Search narration, merchant, ref..."
              value={searchQuery.value}
              onInput={(e: any) => (searchQuery.value = e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* Account Filter */}
          <Select
            value={filterAccountId.value}
            onChange={(e: any) => (filterAccountId.value = e.target.value)}
            className="text-xs h-9"
          >
            <option value="all">All Accounts</option>
            {accounts.value.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.bank} ••{acc.last4}
              </option>
            ))}
          </Select>

          {/* Category Filter */}
          <Select
            value={filterCategory.value}
            onChange={(e: any) => (filterCategory.value = e.target.value as CategoryId)}
            className="text-xs h-9"
          >
            <option value="all">All Categories</option>
            {categoriesJson
              .filter((c) => !c.parent)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>

          {/* In / Out Direction */}
          <Select
            value={filterDirection.value}
            onChange={(e: any) => (filterDirection.value = e.target.value as any)}
            className="text-xs h-9"
          >
            <option value="all">In & Out (All)</option>
            <option value="out">Money Out (Spend)</option>
            <option value="in">Money In (Income)</option>
          </Select>

          {/* Group By Selector */}
          <Select
            value={groupByField.value}
            onChange={(e: any) => (groupByField.value = e.target.value as GroupByField)}
            className="text-xs h-9 font-medium border-primary/40 focus:border-primary"
          >
            <option value="none">Group: Flat Table</option>
            <option value="date">Group: By Day (Date)</option>
            <option value="month">Group: By Month</option>
            <option value="category">Group: By Category</option>
            <option value="account">Group: By Account</option>
            <option value="merchant">Group: By Merchant / Payee</option>
            <option value="upi_app">Group: By UPI App / Method</option>
            <option value="counterparty_bank">Group: By Destination Bank</option>
            <option value="statement">Group: By Statement Batch</option>
          </Select>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground border-t border-border/40">
          <div className="flex items-center space-x-2">
            <span>Sort by:</span>
            <button
              type="button"
              onClick={() => {
                if (sortField.value === 'date') sortAsc.value = !sortAsc.value;
                else {
                  sortField.value = 'date';
                  sortAsc.value = false;
                }
              }}
              className={`font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                sortField.value === 'date'
                  ? 'bg-secondary text-foreground'
                  : 'hover:text-foreground'
              }`}
            >
              Date {sortField.value === 'date' ? (sortAsc.value ? '↑' : '↓') : ''}
            </button>

            <button
              type="button"
              onClick={() => {
                if (sortField.value === 'amount') sortAsc.value = !sortAsc.value;
                else {
                  sortField.value = 'amount';
                  sortAsc.value = false;
                }
              }}
              className={`font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                sortField.value === 'amount'
                  ? 'bg-secondary text-foreground'
                  : 'hover:text-foreground'
              }`}
            >
              Amount {sortField.value === 'amount' ? (sortAsc.value ? '↑' : '↓') : ''}
            </button>

            <button
              type="button"
              onClick={() => {
                if (sortField.value === 'merchant') sortAsc.value = !sortAsc.value;
                else {
                  sortField.value = 'merchant';
                  sortAsc.value = false;
                }
              }}
              className={`font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                sortField.value === 'merchant'
                  ? 'bg-secondary text-foreground'
                  : 'hover:text-foreground'
              }`}
            >
              Merchant {sortField.value === 'merchant' ? (sortAsc.value ? '↑' : '↓') : ''}
            </button>
          </div>

          {(searchQuery.value ||
            filterAccountId.value !== 'all' ||
            filterCategory.value !== 'all' ||
            filterDirection.value !== 'all' ||
            groupByField.value !== 'none') && (
            <button
              type="button"
              onClick={() => {
                searchQuery.value = '';
                filterAccountId.value = 'all';
                filterCategory.value = 'all';
                filterDirection.value = 'all';
                groupByField.value = 'none';
              }}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Transaction Table / Grouped View */}
      {groupByField.value === 'none' ? (
        <TransactionTable txns={list} />
      ) : (
        <GroupedTransactionList key={groupByField.value} groups={groups} />
      )}
    </div>
  );
}
