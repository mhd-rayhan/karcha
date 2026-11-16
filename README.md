# Kharcha

[![CI](https://github.com/mhd-rayhan/karcha/actions/workflows/ci.yml/badge.svg)](https://github.com/mhd-rayhan/karcha/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Telemetry](https://img.shields.io/badge/Telemetry-0%25%20(None)-emerald.svg)](#verifiable-privacy-guarantee)

A local-first, privacy-focused bank and credit card statement analyzer engineered specifically for the Indian banking ecosystem. All processing occurs entirely within the client's browser environment using Web Workers, in-memory signals, and local IndexedDB storage. No financial documents, passwords, or personal data ever leave your machine.

---

## Verifiable Privacy Guarantee

> **"Statements are read in this browser tab and are not uploaded. You can confirm in your browser's network tab."**

Kharcha enforces a strict zero-knowledge architecture:
1. **Zero Outbound Requests**: When you import a document, parse transactions, or view analytics, exactly zero network packets leave your computer.
2. **Strict Content Security Policy (CSP)**: The production server configuration denies all cross-origin connections (`default-src 'none'; connect-src 'self'`).
3. **In-Memory Password Closure**: PDF passwords are used solely to unlock documents in an isolated Web Worker; they are never persisted to disk, stored in IndexedDB, or printed in logs.
4. **Automated Zero-PII Continuous Integration**: Every pull request is statically analyzed by an automated PII detector to ensure test fixtures remain 100% synthetic and anonymized.

To independently verify:
1. Open your browser's Developer Tools (`F12` or `Cmd+Option+I`) and switch to the **Network** tab.
2. Disconnect your internet connection or toggle **Offline** mode in DevTools.
3. Drop an encrypted or unencrypted bank statement into Kharcha.
4. Observe that all parsing, decryption, category matching, and charting complete instantly with zero network activity.

---

## Format & Bank Support Matrix

Kharcha features built-in, layout-resilient parsers calibrated for retail and corporate banking across India:

| Institution | Supported Formats | Engine Capabilities | Verification Status |
| :--- | :--- | :--- | :--- |
| **HDFC Bank** | `.pdf`, `.xls`, `.csv`, `.txt` | Fixed-width dashed ruler slicing, 8-space tab expansion, statement summary reconciliation, customer ID/DOB unlock hints | Verified |
| **Kotak Mahindra Bank** | `.pdf`, `.csv` | Adaptive single-amount with separate `Dr / Cr` indicator columns, tight PDF column clustering ($\le 10\,\text{pt}$), in-table opening balance recovery | Verified |
| **ICICI Bank** | `.xls` (BIFF8), `.xlsx`, `.pdf` | Multi-line UPI parsing, NetBanking detailed statements, Credit card statement cycles | Verified |
| **State Bank of India (SBI)** | `.pdf`, `.csv`, `.txt` | OnlineSBI transaction histories, multi-account running balance verification | Verified |
| **Axis Bank** | `.pdf`, `.csv` | Multi-column running balance savings statements, debit/credit split amounts | Verified |
| **Generic Heuristic Parser** | Arbitrary `.csv`, `.tsv`, `.txt` | Automatic statistical delimiter sniffing, column band detection, and best-effort tabular alignment | Best Effort |

---

## Accounting & Analysis Engine

- **Integer-Paise Precision**: All currency calculations are executed in signed integer `Paise` types, completely eliminating floating-point rounding discrepancies inherent in standard JavaScript numbers.
- **Running Balance Chain Validation (`BAL_CHAIN`)**: Validates every consecutive row to mathematically verify that $\text{Balance}_{n-1} \pm \text{Amount}_n == \text{Balance}_n$. Detects omitted pages or missing transactions.
- **Statement Tie-Out Verification (`OPEN_CLOSE`)**: Mathematically enforces $\text{Opening Balance} + \sum \text{Credits} - \sum \text{Debits} == \text{Closing Balance}$.
- **Deterministic Transaction Hashing**: Computes a truncated 16-character SHA-256 hash over `accountId | date | amount | narration | ref | k` (where $k$ is the ordinal occurrence index), enabling idempotent re-imports without duplicate pollution.
- **Inter-Account Transfer Linking**: Automatically detects and matches self-transfers between accounts (e.g., IMPS/NEFT/UPI transfer from Kotak to HDFC) within a 3-day window, preventing artificial double-counting of income or expenses.
- **Intelligent Payment Categorization**:
  - **Merchant Extraction**: Normalizes 250+ pan-Indian brands (Swiggy, Zomato, Blinkit, Zepto, DMart, Amazon, Flipkart, Uber, Ola).
  - **UPI App / PSP Provider Resolution**: Recognizes PhonePe (`@ybl`, `@ibl`, `@axl`), Google Pay (`@okhdfcbank`, `@okaxis`, `@oksbi`), Paytm (`@paytm`), BHIM (`@upi`), CRED (`@cred`), WhatsApp Pay, and non-UPI channels (Card, IMPS, NEFT, ATM, Mandate).
  - **Counterparty Bank Resolution**: Identifies destination/beneficiary banks (SBI, HDFC, ICICI, Kotak, Axis, Yes Bank, Canara Bank, Bank of Baroda).
  - **Adaptive Grouping**: Group transactions by Date, Month, Category, Account, Merchant, UPI App, or Beneficiary Bank with automatic suppression of redundant row badges.
- **Executive Print Stylesheet**: Native `@media print` rules format the overview and tie-out analysis for executive paper reports or PDF saving via `Cmd+P` with zero third-party dependencies.

---

## Technical Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **UI Framework** | [Preact 10](https://preactjs.com/) | 3 KB lightweight alternative to React with identical JSX syntax |
| **State Management** | [@preact/signals](https://preactjs.com/guide/v10/signals/) | Atomic reactivity with zero unnecessary component re-renders |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) | Minimal CSS footprint with full light/dark theme support |
| **DOM Virtualization** | [@tanstack/react-virtual](https://tanstack.com/virtual) | Smooth 60 FPS scrolling over 100,000+ transaction rows |
| **Visualizations** | [Recharts 2](https://recharts.org/) | Accessible SVG bar charts and category distribution visualizers |
| **PDF Extraction** | [PDF.js 4](https://mozilla.github.io/pdf.js/) | In-worker client-side PDF text extraction and password unlock |
| **Spreadsheet Parsing**| [SheetJS (xlsx)](https://sheetjs.com/) | Support for binary BIFF8 (`.xls`) and modern OpenXML (`.xlsx`) |
| **Local Storage** | [idb](https://github.com/jakearchibald/idb) | Typed IndexedDB wrapper for optional local persistence |
| **Tooling & Linter** | [Biome](https://biomejs.dev/) & [Vite 6](https://vitejs.dev/) | 15 ms formatting and optimized code-split bundle generation |

---

## Getting Started

### Prerequisites

- Node.js 18 or higher (Node 20+ LTS recommended)
- [pnpm](https://pnpm.io/) package manager (`corepack enable && corepack prepare pnpm@latest --activate`)

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/mhd-rayhan/karcha.git
cd karcha

# Install dependencies
pnpm install

# Start local development server
pnpm dev
```

Visit `http://localhost:5173/` in your browser.

---

## Verification & Quality Assurance

```bash
# Execute automated test suite (Vitest)
pnpm test

# Run Biome linter and format validation
pnpm lint

# Execute Zero-PII security scan
pnpm pii:check

# Compile production bundle
pnpm build
```

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
