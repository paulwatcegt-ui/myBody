// PulseSense — Database Connection Manager
// Opens SQLite DB once, runs migrations on first open, returns cached instance thereafter

import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';
import { ensureHealthSyncSchema } from './queries/healthSync';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let migrationsRan = false;
let initPromise: Promise<void> | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Returns the cached database instance, or null if not yet initialized.
 */
export function getDBInstance(): SQLite.SQLiteDatabase | null {
  return dbInstance;
}

/**
 * Close the database and reset all state.
 */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.closeAsync();
    } catch {
      // ignore close errors
    }
    dbInstance = null;
  }
  dbPromise = null;
  initPromise = null;
  migrationsRan = false;
}

/**
 * Get (or create) the singleton database connection.
 *
 * Only one connection is ever opened — subsequent calls return the cached
 * instance.  The initial call runs migrations and ensures FK enforcement.
 */
export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  // Fast path: already opened and cached
  if (dbInstance) {
    return dbInstance;
  }

  // Slow path: first call — guard with dbPromise so concurrent callers
  // share a single open + migrate sequence.
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('mybody.db');

      if (!migrationsRan) {
        if (!initPromise) {
          initPromise = (async () => {
            await runMigrations(db);
            await ensureHealthSyncSchema(db);
            migrationsRan = true;
          })();
        }
        await initPromise;
      }

      // PRAGMA is per-connection — run once on our singleton.
      await db.execAsync('PRAGMA foreign_keys = ON;');

      dbInstance = db;
      return db;
    })().catch((error) => {
      dbPromise = null;
      initPromise = null;
      migrationsRan = false;
      throw error;
    });
  }

  return dbPromise;
}

/**
 * Alias for getDB() — ensures the database is initialized and ready.
 */
export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  return getDB();
}
