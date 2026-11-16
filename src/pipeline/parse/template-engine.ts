import { parseDate, toIsoDate } from '@/lib/dates';
import { fastHash } from '@/lib/hash';
import { toPaise } from '@/lib/money';
import type { Paise } from '@/types/brands';
import type { Issue } from '@/types/models';
import type { ExtractedDoc, TextItem } from '../extract/types';
import type { BankTemplate, ParseResult, RawParsedTxn } from './types';

interface Line {
  y: number;
  page: number;
  items: TextItem[];
}

interface ColumnBand {
  type:
    | 'date'
    | 'narration'
    | 'debit'
    | 'credit'
    | 'amount'
    | 'drCr'
    | 'balance'
    | 'ref'
    | 'valueDate';
  x0: number;
  x1: number;
}

export function parseWithTemplate(doc: ExtractedDoc, template: BankTemplate): ParseResult {
  const issues: Issue[] = [];

  // 1. Group items into physical horizontal lines
  const linesByPage = groupLines(doc.items);

  // 2. Locate Table Header & define Column Bands
  let columnBands: ColumnBand[] = [];
  let headerLineIndex = -1;
  let headerPage = 1;

  const minRequiredBands = template.product === 'card' ? 2 : 3;

  for (const [page, lines] of linesByPage.entries()) {
    for (let i = 0; i < lines.length; i++) {
      const bands = matchHeaderLine(lines[i], template);
      if (bands.length >= minRequiredBands) {
        columnBands = bands;
        headerLineIndex = i;
        headerPage = page;
        break;
      }
    }
    if (columnBands.length >= minRequiredBands) break;
  }

  // Fallback bands if header wasn't matched explicitly
  if (columnBands.length === 0) {
    if (template.amounts.style === 'drcr-suffix' || template.product === 'card') {
      columnBands = [
        { type: 'date', x0: 0, x1: 120 },
        { type: 'narration', x0: 120, x1: 420 },
        { type: 'amount', x0: 420, x1: 650 },
      ];
    } else {
      columnBands = [
        { type: 'date', x0: 0, x1: 100 },
        { type: 'narration', x0: 100, x1: 350 },
        { type: 'debit', x0: 350, x1: 450 },
        { type: 'credit', x0: 450, x1: 550 },
        { type: 'balance', x0: 550, x1: 700 },
      ];
    }
    issues.push({
      code: 'LAYOUT_DRIFT',
      severity: 'warn',
      message: 'Could not clearly identify table header columns; using heuristic positions.',
    });
  }

  // 3. Extract statement metadata (account number, period, opening/closing)
  const metadata = extractMetadata(doc, template);

  // 4. Extract rows
  const rawTxns: RawParsedTxn[] = [];
  let currentTxn: RawParsedTxn | null = null;

  for (const [page, lines] of linesByPage.entries()) {
    const startIndex = page === headerPage ? headerLineIndex + 1 : 0;

    for (let l = startIndex; l < lines.length; l++) {
      const line = lines[l];
      const lineText = line.items.map((it) => it.text).join(' ');

      // Stop condition (e.g. Legends, End of Statement footer, Account Summary)
      if (
        template.rows.stopLines?.some((pat) => new RegExp(pat, 'i').test(lineText.trim())) ||
        /(?:End of Statement|Account Summary|STATEMENT SUMMARY\s*:-)/i.test(lineText.trim())
      ) {
        break;
      }

      // Ignore patterns (e.g. Page X of Y, intermediate subtotals)
      if (template.rows.ignoreLines?.some((pat) => new RegExp(pat, 'i').test(lineText))) {
        continue;
      }

      // Check if line starts a new row by parsing date from the date column band
      const dateBand = getBand(columnBands, 'date') || getBand(columnBands, 'valueDate');
      const dateItems = line.items.filter((it) => isInBand(it, dateBand));
      const dateCandidate = dateItems
        .map((it) => it.text)
        .join(' ')
        .trim();
      let parsedDate = parseDate(dateCandidate);

      // Robustness fallback: if band check missed slightly, check first item of line
      if (!parsedDate && line.items.length > 0) {
        const firstItemDate = parseDate(line.items[0].text.trim());
        if (firstItemDate) {
          parsedDate = firstItemDate;
        } else if (line.items.length > 1) {
          const firstTwo = `${line.items[0].text} ${line.items[1].text}`.trim();
          parsedDate = parseDate(firstTwo);
        }
      }

      // Check for in-table Opening Balance row (e.g. Kotak PDF row 0: "- - Opening Balance - - - 2,36,455.40")
      if (!parsedDate && /Opening Balance|Balance B\/F|\bB\/F\b/i.test(lineText)) {
        const balBand = getBand(columnBands, 'balance');
        const balItem = line.items.find((it) => isInBand(it, balBand));
        if (balItem) {
          const p = toPaise(balItem.text);
          if (p !== 0 && metadata.opening === undefined) {
            metadata.opening = p;
          }
        }
        continue;
      }

      if (parsedDate) {
        // Finalize previous transaction if open
        if (currentTxn) {
          rawTxns.push(currentTxn);
        }

        // Parse columns for this new row
        const narrationItems = line.items.filter((it) =>
          isInBand(it, getBand(columnBands, 'narration')),
        );
        const debitItems = line.items.filter((it) => isInBand(it, getBand(columnBands, 'debit')));
        const creditItems = line.items.filter((it) => isInBand(it, getBand(columnBands, 'credit')));
        const amountItems = line.items.filter((it) => isInBand(it, getBand(columnBands, 'amount')));
        const balanceItems = line.items.filter((it) =>
          isInBand(it, getBand(columnBands, 'balance')),
        );
        const refItems = line.items.filter((it) => isInBand(it, getBand(columnBands, 'ref')));
        const valueDateItems = line.items.filter((it) =>
          isInBand(it, getBand(columnBands, 'valueDate')),
        );

        const narrationText = narrationItems
          .map((it) => it.text)
          .join(' ')
          .trim();
        const debitText = debitItems
          .map((it) => it.text)
          .join(' ')
          .trim();
        const creditText = creditItems
          .map((it) => it.text)
          .join(' ')
          .trim();
        const amountText = amountItems
          .map((it) => it.text)
          .join(' ')
          .trim();
        const balanceText = balanceItems
          .map((it) => it.text)
          .join(' ')
          .trim();
        const refText = refItems
          .map((it) => it.text)
          .join(' ')
          .trim();
        const valueDateCandidate = valueDateItems
          .map((it) => it.text)
          .join(' ')
          .trim();
        const parsedValueDate = parseDate(valueDateCandidate);

        const debitBand = getBand(columnBands, 'debit');
        const creditBand = getBand(columnBands, 'credit');
        const amountBand = getBand(columnBands, 'amount');
        const balBand = getBand(columnBands, 'balance');
        const allDrCrBands = columnBands.filter((b) => b.type === 'drCr');

        // Partition DrCr bands into amountDrCr and balanceDrCr if multiple
        let amountDrCrBand: ColumnBand | undefined;
        let balanceDrCrBand: ColumnBand | undefined;
        for (const b of allDrCrBands) {
          if (balBand && b.x0 >= balBand.x0) {
            balanceDrCrBand = b;
          } else {
            amountDrCrBand = b;
          }
        }

        let amountPaise = 0 as Paise;
        if (debitBand && creditBand) {
          const debitPaise = debitText ? toPaise(debitText) : 0;
          const creditPaise = creditText ? toPaise(creditText) : 0;
          if (debitPaise > 0) {
            amountPaise = -Math.abs(debitPaise) as Paise;
          } else if (creditPaise > 0) {
            amountPaise = Math.abs(creditPaise) as Paise;
          } else if (debitText && debitPaise !== 0) {
            amountPaise = -Math.abs(debitPaise) as Paise;
          } else {
            amountPaise = 0 as Paise;
          }
        } else if (amountBand && amountDrCrBand) {
          const drCrItems = line.items.filter((it) => isInBand(it, amountDrCrBand));
          const drCrText = drCrItems
            .map((it) => it.text)
            .join(' ')
            .trim();
          const rawAmt = toPaise(amountText);
          if (/CR/i.test(drCrText)) {
            amountPaise = Math.abs(rawAmt) as Paise;
          } else if (/DR/i.test(drCrText)) {
            amountPaise = -Math.abs(rawAmt) as Paise;
          } else {
            amountPaise = -Math.abs(rawAmt) as Paise;
          }
        } else if (template.amounts.style === 'split-columns') {
          const debitPaise = debitText ? toPaise(debitText) : 0;
          const creditPaise = creditText ? toPaise(creditText) : 0;
          if (debitPaise > 0) {
            amountPaise = -Math.abs(debitPaise) as Paise;
          } else if (creditPaise > 0) {
            amountPaise = Math.abs(creditPaise) as Paise;
          } else if (debitText && debitPaise !== 0) {
            amountPaise = -Math.abs(debitPaise) as Paise;
          } else {
            amountPaise = 0 as Paise;
          }
        } else if (template.amounts.style === 'drcr-suffix') {
          const raw = amountText || debitText || creditText;
          if (/CR/i.test(raw)) amountPaise = Math.abs(toPaise(raw)) as Paise;
          else if (/DR/i.test(raw)) amountPaise = -Math.abs(toPaise(raw)) as Paise;
          else {
            const p = toPaise(raw);
            amountPaise = template.product === 'card' ? (-Math.abs(p) as Paise) : p;
          }
        } else {
          amountPaise = toPaise(amountText);
        }

        let balancePaise = balanceText ? toPaise(balanceText) : undefined;
        if (balancePaise !== undefined && balanceDrCrBand) {
          const bDrCrItems = line.items.filter((it) => isInBand(it, balanceDrCrBand));
          const bDrCrText = bDrCrItems
            .map((it) => it.text)
            .join(' ')
            .trim();
          if (/DR/i.test(bDrCrText)) {
            balancePaise = -Math.abs(balancePaise) as Paise;
          }
        }

        currentTxn = {
          date: parsedDate,
          valueDate: parsedValueDate || undefined,
          narration: narrationText || 'Bank Transaction',
          amount: amountPaise,
          balanceAfter: balancePaise,
          ref: refText || undefined,
          source: { page, line: l },
        };
      } else if (currentTxn) {
        // Line continuation: append text to current narration
        const extraText = line.items
          .map((it) => it.text)
          .join(' ')
          .trim();
        if (extraText) {
          currentTxn.narration += ` ${extraText}`;
        }
      }
    }
  }

  if (currentTxn) {
    rawTxns.push(currentTxn);
  }

  // 5. Finalize metadata period: if statement had no explicit printed dates, derive from transactions
  let finalPeriodStart = metadata.periodStart;
  let finalPeriodEnd = metadata.periodEnd;
  const validTxnDates = rawTxns
    .map((t) => t.date)
    .filter(Boolean)
    .sort();
  if (validTxnDates.length > 0) {
    if (!finalPeriodStart || finalPeriodStart === '2024-01-01') {
      finalPeriodStart = validTxnDates[0];
    }
    if (!finalPeriodEnd || finalPeriodEnd === '2024-12-31') {
      finalPeriodEnd = validTxnDates[validTxnDates.length - 1];
    }
  }

  // Derived Opening / Closing balances if omitted from explicit summary
  let finalOpening = metadata.opening;
  let finalClosing = metadata.closing;
  if (finalOpening === undefined && rawTxns.length > 0) {
    const firstTxn = rawTxns[0];
    if (firstTxn.balanceAfter !== undefined) {
      finalOpening = (firstTxn.balanceAfter - firstTxn.amount) as Paise;
    }
  }
  if (finalClosing === undefined && rawTxns.length > 0) {
    const lastTxn = rawTxns[rawTxns.length - 1];
    if (lastTxn.balanceAfter !== undefined) {
      finalClosing = lastTxn.balanceAfter;
    }
  }

  // 6. Layout fingerprint
  const fingerprint = fastHash(`${template.id}-${columnBands.map((b) => b.type).join(':')}`);

  return {
    statement: {
      accountId: metadata.accountId,
      periodStart: finalPeriodStart,
      periodEnd: finalPeriodEnd,
      opening: finalOpening,
      closing: finalClosing,
      printedTotals: metadata.printedTotals,
      parser: {
        id: template.id,
        version: String(template.version),
        layoutFingerprint: fingerprint,
      },
    },
    account: {
      bank: template.bank,
      product: template.product,
      last4: metadata.last4,
    },
    txns: rawTxns,
    issues,
  };
}

function groupLines(items: TextItem[]): Map<number, Line[]> {
  const pages = new Map<number, Line[]>();

  // Group by page first
  const pageItems = new Map<number, TextItem[]>();
  for (const it of items) {
    const list = pageItems.get(it.page) || [];
    list.push(it);
    pageItems.set(it.page, list);
  }

  for (const [page, pItems] of pageItems.entries()) {
    // Sort items top-to-bottom (Y desc), then left-to-right (X asc)
    pItems.sort((a, b) => b.y - a.y || a.x0 - b.x0);

    const lines: Line[] = [];
    for (const it of pItems) {
      const matchLine = lines.find((l) => Math.abs(l.y - it.y) <= 4);
      if (matchLine) {
        matchLine.items.push(it);
        matchLine.items.sort((a, b) => a.x0 - b.x0);
      } else {
        lines.push({ y: it.y, page, items: [it] });
      }
    }
    // Sort lines top to bottom
    lines.sort((a, b) => b.y - a.y);
    pages.set(page, lines);
  }

  return pages;
}

function matchesHeader(cellText: string, synonym: string): boolean {
  const normText = cellText
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const normSyn = synonym
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (normText === normSyn) return true;
  return new RegExp(`\\b${normSyn}\\b`, 'i').test(normText);
}

interface ClusteredItem {
  text: string;
  x0: number;
  x1: number;
}

function clusterLineItems(items: TextItem[], maxGap = 10): ClusteredItem[] {
  if (items.length === 0) return [];
  const clusters: ClusteredItem[] = [];
  let curr: ClusteredItem = { text: items[0].text, x0: items[0].x0, x1: items[0].x1 };

  for (let i = 1; i < items.length; i++) {
    const it = items[i];
    if (it.x0 - curr.x1 <= maxGap) {
      curr.text += ` ${it.text}`;
      curr.x1 = Math.max(curr.x1, it.x1);
    } else {
      clusters.push(curr);
      curr = { text: it.text, x0: it.x0, x1: it.x1 };
    }
  }
  clusters.push(curr);
  return clusters;
}

function matchHeaderLine(line: Line, template: BankTemplate): ColumnBand[] {
  const bands: ColumnBand[] = [];
  // Evaluate clustered items first for multi-word headings
  const candidates = clusterLineItems(line.items);

  for (const it of candidates) {
    const t = it.text.trim();
    if (template.header.valueDate?.some((s) => matchesHeader(t, s))) {
      bands.push({ type: 'valueDate', x0: it.x0 - 20, x1: it.x1 + 30 });
    } else if (template.header.date.some((s) => matchesHeader(t, s))) {
      bands.push({ type: 'date', x0: it.x0 - 20, x1: it.x1 + 30 });
    } else if (template.header.narration.some((s) => matchesHeader(t, s))) {
      bands.push({ type: 'narration', x0: it.x0 - 20, x1: it.x1 + 80 });
    } else if (template.header.debit?.some((s) => matchesHeader(t, s))) {
      bands.push({ type: 'debit', x0: it.x0 - 25, x1: it.x1 + 25 });
    } else if (template.header.credit?.some((s) => matchesHeader(t, s))) {
      bands.push({ type: 'credit', x0: it.x0 - 25, x1: it.x1 + 25 });
    } else if (template.header.amount?.some((s) => matchesHeader(t, s))) {
      bands.push({ type: 'amount', x0: it.x0 - 25, x1: it.x1 + 35 });
    } else if (template.header.drCr?.some((s) => matchesHeader(t, s))) {
      bands.push({ type: 'drCr', x0: it.x0 - 20, x1: it.x1 + 25 });
    } else if (template.header.balance?.some((s) => matchesHeader(t, s))) {
      bands.push({ type: 'balance', x0: it.x0 - 25, x1: it.x1 + 50 });
    } else if (template.header.ref?.some((s) => matchesHeader(t, s))) {
      bands.push({ type: 'ref', x0: it.x0 - 15, x1: it.x1 + 30 });
    }
  }

  return bands;
}

function isInBand(it: TextItem, band?: ColumnBand): boolean {
  if (!band) return false;
  const mid = (it.x0 + it.x1) / 2;
  return mid >= band.x0 && mid <= band.x1;
}

function getBand(bands: ColumnBand[], type: ColumnBand['type']): ColumnBand | undefined {
  return bands.find((b) => b.type === type);
}

function extractMetadata(doc: ExtractedDoc, template: BankTemplate) {
  const fullText = doc.items.map((i) => i.text).join(' ');

  // Extract account or card last 4
  let last4 = 'XXXX';
  const accMatch = fullText.match(
    /(?:Account|A\/c|Card|Acct|ending in)\s*(?:No|Number|#)?\.?\s*[:\s]*([X*\d\s-]{4,30})/i,
  );
  if (accMatch) {
    const digits = accMatch[1].replace(/\D/g, '');
    if (digits.length >= 4) {
      last4 = digits.slice(-4);
    }
  }
  if (last4 === 'XXXX') {
    const listMatch = fullText.match(/Transactions\s+List[^-]*-.*?(\d{8,20})/i);
    if (listMatch) {
      last4 = listMatch[1].slice(-4);
    } else {
      const maskedMatch = fullText.match(/(?:[X*]{2,}[\s-]*){1,3}(\d{4})/i);
      if (maskedMatch) {
        last4 = maskedMatch[1];
      }
    }
  }
  if (last4 === 'XXXX' && doc.meta?.filenameHint) {
    const fnMatch = doc.meta.filenameHint.match(/(?:XX|_)([0-9]{4})\b/i);
    if (fnMatch) last4 = fnMatch[1];
  }

  // Extract period
  let periodStart = toIsoDate('2024-01-01')!;
  let periodEnd = toIsoDate('2024-12-31')!;

  const periodMatch = fullText.match(
    /(?:Statement From|Statement Period|Billing Period|Period|From|Transaction Date from|Date from)[:\s]*([0-9A-Za-z\-/.]+)\s*(?:to\s*:?|-)\s*([0-9A-Za-z\-/.]+)/i,
  );
  if (periodMatch) {
    const s = parseDate(periodMatch[1]);
    const e = parseDate(periodMatch[2]);
    if (s && e) {
      periodStart = s;
      periodEnd = e;
    }
  }

  // Extract Opening / Closing balances
  let opening: Paise | undefined;
  let closing: Paise | undefined;

  // Pattern A: HDFC Statement Summary Block:
  // "Opening Balance Debits Credits Closing Bal <open> <deb> <cred> <close>"
  const hdfcSummary = fullText.match(
    /Opening Balance\s+Debits\s+Credits\s+Closing Bal\s*([0-9,.]+)\s+([0-9,.]+)\s+([0-9,.]+)\s+([0-9,.]+)/i,
  );
  if (hdfcSummary) {
    opening = toPaise(hdfcSummary[1]);
    closing = toPaise(hdfcSummary[4]);
  }

  // Pattern B: Kotak PDF Account Summary:
  // "Savings Account (SA): <open> <close>"
  if (opening === undefined || closing === undefined) {
    const kotakSummary = fullText.match(
      /(?:Savings Account\s*(?:\([A-Z]+\))?|SA\s*:)\s*([0-9,.]+)\s+([0-9,.]+)/i,
    );
    if (kotakSummary) {
      if (opening === undefined) opening = toPaise(kotakSummary[1]);
      if (closing === undefined) closing = toPaise(kotakSummary[2]);
    }
  }

  // Pattern C: Kotak CSV Footer:
  // "Closing Balance as on <date> INR <amount>"
  if (closing === undefined) {
    const closeAsOn = fullText.match(
      /Closing Balance as on\s+[0-9A-Za-z\-/.]+\s*(?:INR|Rs\.?|₹)?\s*([0-9,.]+)/i,
    );
    if (closeAsOn) closing = toPaise(closeAsOn[1]);
  }

  // Pattern D: Standard key-value pairs
  if (opening === undefined) {
    const openMatch = fullText.match(
      /(?:Opening Balance|B\/F|Balance B\/F|Prev Balance)[:\s]*([0-9,.]+)/i,
    );
    if (openMatch) opening = toPaise(openMatch[1]);
  }

  if (closing === undefined) {
    const closeMatch = fullText.match(/(?:Closing Balance|Total Balance|C\/F)[:\s]*([0-9,.]+)/i);
    if (closeMatch) closing = toPaise(closeMatch[1]);
  }

  const accountId = `${template.bank}-${template.product}-${last4}`;

  return {
    accountId,
    last4,
    periodStart,
    periodEnd,
    opening,
    closing,
    printedTotals: undefined,
  };
}
