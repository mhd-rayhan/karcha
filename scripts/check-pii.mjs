import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const piiHits = [];
const scanDirs = ['src', 'test', 'scripts', 'public'];

// Whitelisted synthetic test domains / strings
const IGNORED_EMAIL_DOMAINS = [
  'example.com',
  'user@upi',
  'payee@oksbi',
  'cashback@bhim',
  'swiggy@icici',
  'uber@axis',
  'blink@kotak',
  'blink@ybl',
  'validaxis',
  'users.noreply.github.com',
];

function isWhitelistedEmail(email) {
  const lower = email.toLowerCase();
  return IGNORED_EMAIL_DOMAINS.some((domain) => lower.includes(domain));
}

function scanTextFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // 1. Phone numbers: 10-digit Indian numbers starting with 6, 7, 8, or 9
    const phones = line.match(/\b[6-9]\d{9}\b/g) || [];
    for (const ph of phones) {
      piiHits.push({
        file: path.relative(rootDir, filePath),
        line: idx + 1,
        type: 'Indian Mobile Phone Number',
        value: ph,
      });
    }

    // 2. Email addresses
    const emails = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    for (const em of emails) {
      if (!isWhitelistedEmail(em)) {
        piiHits.push({
          file: path.relative(rootDir, filePath),
          line: idx + 1,
          type: 'Unmasked Email Address',
          value: em,
        });
      }
    }

    // 3. Indian PAN: 5 uppercase letters, 4 digits, 1 uppercase letter
    const pans = line.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g) || [];
    for (const p of pans) {
      piiHits.push({
        file: path.relative(rootDir, filePath),
        line: idx + 1,
        type: 'Indian Permanent Account Number (PAN)',
        value: p,
      });
    }

    // 4. Indian Aadhaar: 12 digits formatted as XXXX XXXX XXXX
    const aadhaar = line.match(/\b\d{4}\s\d{4}\s\d{4}\b/g) || [];
    for (const a of aadhaar) {
      piiHits.push({
        file: path.relative(rootDir, filePath),
        line: idx + 1,
        type: 'Indian Aadhaar Number',
        value: a,
      });
    }
  });
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      if (entry !== 'node_modules' && entry !== 'dist' && entry !== '.git') {
        walk(full);
      }
    } else {
      // Disallow statement binaries outside test/fixtures
      if (
        (entry.endsWith('.pdf') || entry.endsWith('.xlsx') || entry.endsWith('.xls')) &&
        !full.includes(path.join('test', 'fixtures'))
      ) {
        piiHits.push({
          file: path.relative(rootDir, full),
          line: 0,
          type: 'Forbidden Statement Binary Outside test/fixtures',
          value: entry,
        });
      } else if (/\.(ts|tsx|js|mjs|json|css|html|md|txt|csv)$/.test(entry)) {
        scanTextFile(full);
      }
    }
  }
}

// Execute scan
for (const d of scanDirs) {
  walk(path.join(rootDir, d));
}

// Also scan root files
for (const rootFile of ['package.json', 'README.md', 'index.html', 'vite.config.ts']) {
  const p = path.join(rootDir, rootFile);
  if (fs.existsSync(p)) scanTextFile(p);
}

if (piiHits.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', '❌ PII AUDIT FAILED: Potential personal data discovered:');
  for (const hit of piiHits) {
    console.error(`  - [${hit.type}] at ${hit.file}:${hit.line} -> ${hit.value}`);
  }
  process.exit(1);
} else {
  console.log(
    '\x1b[32m%s\x1b[0m',
    '✅ ZERO-PII AUDIT PASSED: No sensitive personal data found in repository.',
  );
  process.exit(0);
}
