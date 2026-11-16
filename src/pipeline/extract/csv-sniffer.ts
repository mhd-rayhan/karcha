import type { ExtractedDoc, TextItem } from './types';

/**
 * Expands tab characters into spaces based on standard tab stops (default 8).
 */
function expandTabs(line: string, tabSize = 8): string {
  let result = '';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '\t') {
      const spaces = tabSize - (result.length % tabSize);
      result += ' '.repeat(spaces);
    } else {
      result += char;
    }
  }
  return result;
}

export function parseDelimitedText(text: string, filename: string): ExtractedDoc {
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) {
    return { pages: 1, items: [], meta: { source: 'csv', filenameHint: filename } };
  }

  const lines = rawLines.map((l) => expandTabs(l, 8));

  // Check for dashed ruler line pattern (e.g. "--------  -------------------  --------")
  const rulerRegex = /^[-=]{4,}(\s+[-=]{4,})+/;
  const rulerIdx = lines.findIndex((l) => rulerRegex.test(l.trim()));

  const items: TextItem[] = [];
  let currentY = 100000; // High decreasing synthetic Y coordinate

  if (rulerIdx !== -1) {
    const rulerLine = lines[rulerIdx];
    const bands: { start: number; end: number }[] = [];
    const regex = /[-=]+/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(rulerLine)) !== null) {
      bands.push({ start: match.index, end: match.index + match[0].length });
    }

    let inTable = false;
    let tableEnded = false;
    let hadDataRow = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isRuler = rulerRegex.test(line.trim());
      const isTableEndMarker =
        hadDataRow &&
        (/STATEMENT SUMMARY/i.test(line) ||
          /^[*\s]{20,}$/.test(line.trim()) ||
          /End Of Statement/i.test(line));

      if (isTableEndMarker) {
        inTable = false;
        tableEnded = true;
      }

      if (isRuler) {
        if (!inTable && !tableEnded) {
          inTable = true;
        } else if (hadDataRow) {
          inTable = false;
          tableEnded = true;
        }
        continue;
      }

      // Check if header line is immediately before ruler
      const isHeaderBeforeRuler =
        !inTable &&
        !tableEnded &&
        i === rulerIdx - 1 &&
        /Date|Narration|Description|Particulars/i.test(line);

      const isTableLine = inTable || isHeaderBeforeRuler;

      if (isTableLine && !tableEnded) {
        let hasCell = false;
        for (let c = 0; c < bands.length; c++) {
          const b = bands[c];
          const cell = line.substring(b.start, b.end).trim();
          if (cell) {
            hasCell = true;
            // Assign deterministic column band grid: colIdx * 200, width 150
            items.push({
              text: cell,
              x0: c * 200,
              x1: c * 200 + 150,
              y: currentY,
              page: 1,
            });
          }
        }
        if (i > rulerIdx + 1 && hasCell) {
          hadDataRow = true;
        }
      } else {
        // Outside table lines (metadata before table, or summary after table)
        const parts = line
          .split(/\s{2,}/)
          .map((p) => p.trim())
          .filter(Boolean);
        let curX = 50;
        for (const p of parts) {
          items.push({
            text: p,
            x0: curX,
            x1: curX + Math.max(50, p.length * 8),
            y: currentY,
            page: 1,
          });
          curX += Math.max(80, p.length * 8 + 30);
        }
      }
      currentY -= 20;
    }

    return {
      pages: 1,
      items,
      meta: {
        source: 'csv',
        filenameHint: filename,
      },
    };
  }

  // Sniff delimiter across up to 25 lines
  const sample = lines.slice(0, 25).join('\n');
  const counts = {
    ',': (sample.match(/,/g) || []).length,
    '\t': (sample.match(/\t/g) || []).length,
    ';': (sample.match(/;/g) || []).length,
    '|': (sample.match(/\|/g) || []).length,
  };

  let delimiter = ',';
  let maxCount = 0;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      delimiter = delim;
    }
  }

  for (let lineIdx = 0; lineIdx < rawLines.length; lineIdx++) {
    const rawLine = rawLines[lineIdx];
    const cells = splitDelimitedLine(rawLine, delimiter);

    for (let colIdx = 0; colIdx < cells.length; colIdx++) {
      const cell = cells[colIdx].trim();
      if (cell) {
        // Assign uniform column grid to eliminate row-width drift
        items.push({
          text: cell,
          x0: colIdx * 200,
          x1: colIdx * 200 + 150,
          y: currentY,
          page: 1,
        });
      }
    }
    currentY -= 20;
  }

  return {
    pages: 1,
    items,
    meta: {
      source: 'csv',
      filenameHint: filename,
    },
  };
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
