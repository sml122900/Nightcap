import { SQLiteDatabase } from 'expo-sqlite';
import { purgeExpiredTrash, syncPendingAssetDeletes } from '../services/trash';
import { runMigrations } from './migrations';
import { MOCK_SEED_ENABLED, seedIfEmpty } from './seed';

/**
 * Passed as SQLiteProvider's onInit — runs once before the app renders (Suspense-gated).
 * The real screenshot scan is deliberately NOT run here: it can be slow (permission checks,
 * file copies), and blocking the first render on it would delay app startup. TriageScreen
 * kicks it off after mount instead.
 */
export async function initDb(db: SQLiteDatabase): Promise<void> {
  await runMigrations(db);
  if (MOCK_SEED_ENABLED) await seedIfEmpty(db);
  await purgeExpiredTrash(db);
  await syncPendingAssetDeletes(db);
}
