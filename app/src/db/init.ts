import { SQLiteDatabase } from 'expo-sqlite';
import { purgeExpiredTrash, syncPendingAssetDeletes } from '../services/trash';
import { runMigrations } from './migrations';
import { seedIfEmpty } from './seed';

/** Passed as SQLiteProvider's onInit — runs once before the app renders. */
export async function initDb(db: SQLiteDatabase): Promise<void> {
  await runMigrations(db);
  await seedIfEmpty(db);
  await purgeExpiredTrash(db);
  await syncPendingAssetDeletes(db);
}
