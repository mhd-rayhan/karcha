import { type IDBPDatabase, openDB } from 'idb';
import { accounts, rules, settings, statements, txns } from './index';

const DB_NAME = 'kharcha_local_db';
const DB_VERSION = 1;

interface KharchaSchema {
  accounts: { key: string; value: any };
  statements: { key: string; value: any };
  txns: { key: string; value: any };
  rules: { key: string; value: any };
  settings: { key: string; value: any };
}

let dbPromise: Promise<IDBPDatabase<KharchaSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<KharchaSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('accounts'))
          db.createObjectStore('accounts', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('statements'))
          db.createObjectStore('statements', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('txns')) db.createObjectStore('txns', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('rules'))
          db.createObjectStore('rules', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
      },
    });
  }
  return dbPromise;
}

export async function saveToDB(): Promise<void> {
  if (settings.value.persistence !== 'device') return;
  try {
    const db = await getDB();
    const tx = db.transaction(['accounts', 'statements', 'txns', 'rules', 'settings'], 'readwrite');

    await tx.objectStore('accounts').clear();
    for (const a of accounts.value) await tx.objectStore('accounts').put(a);

    await tx.objectStore('statements').clear();
    for (const s of statements.value) await tx.objectStore('statements').put(s);

    await tx.objectStore('txns').clear();
    for (const t of txns.value) await tx.objectStore('txns').put(t);

    await tx.objectStore('rules').clear();
    for (const r of rules.value) await tx.objectStore('rules').put(r);

    await tx.objectStore('settings').put(settings.value, 'app_settings');
    await tx.done;
  } catch (err) {
    console.error('Failed to persist to IndexedDB:', err);
  }
}

export async function loadFromDB(): Promise<boolean> {
  try {
    const db = await getDB();
    const loadedSettings = await db.get('settings', 'app_settings');
    if (loadedSettings?.persistence !== 'device') {
      return false;
    }

    settings.value = loadedSettings;
    accounts.value = await db.getAll('accounts');
    statements.value = await db.getAll('statements');
    txns.value = await db.getAll('txns');
    rules.value = await db.getAll('rules');
    return statements.value.length > 0;
  } catch (err) {
    console.error('Failed to load from IndexedDB:', err);
    return false;
  }
}

export async function clearDB(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(['accounts', 'statements', 'txns', 'rules', 'settings'], 'readwrite');
    await tx.objectStore('accounts').clear();
    await tx.objectStore('statements').clear();
    await tx.objectStore('txns').clear();
    await tx.objectStore('rules').clear();
    await tx.objectStore('settings').clear();
    await tx.done;
  } catch (err) {
    console.error('Failed to clear IndexedDB:', err);
  }
}
