import { SQLiteDatabase } from 'expo-sqlite';
import { MOCK_CAPTURES } from '../constants/mockCaptures';

/**
 * Stand-in for the real screenshot-scan pipeline (PROJECT.md §3, not yet built).
 * Seeds today's stack from MOCK_CAPTURES so the swipe engine has something to
 * triage. `created_at` is spread across "today" using each item's `time` label
 * so held_count/created_at ordering behaves sensibly.
 */
async function insertMockCapture(db: SQLiteDatabase, item: (typeof MOCK_CAPTURES)[number]): Promise<void> {
  const [hh, mm] = item.time.split(':').map(Number);
  const createdAt = new Date();
  createdAt.setHours(hh, mm, 0, 0);
  await db.runAsync(
    `INSERT INTO captures (id, created_at, source_app, title, channel, kind, progress, is_drm)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    item.id,
    createdAt.getTime(),
    item.app,
    item.title,
    item.src,
    item.kind,
    item.progress ?? null,
    item.kind === 'drm' ? 1 : 0
  );
}

export async function seedIfEmpty(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM captures');
  if ((row?.count ?? 0) > 0) return;
  for (const item of MOCK_CAPTURES) {
    await insertMockCapture(db, item);
  }
}

/** Dev-convenience "다시 시작": wipe and reseed, used by the demo restart button. */
export async function resetDemoData(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('DELETE FROM captures');
  for (const item of MOCK_CAPTURES) {
    await insertMockCapture(db, item);
  }
}
