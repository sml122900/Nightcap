import { SQLiteDatabase } from 'expo-sqlite';

const AUTO_SCAN_KEY = 'auto_scan_enabled';
const ONBOARDING_COMPLETED_KEY = 'onboarding_completed_at';

/**
 * Reuses the `meta` key/value table (added for the scan watermark, migrations.ts v2) instead of
 * a new settings table/migration — a single boolean toggle doesn't need its own schema.
 */
export async function getAutoScanEnabled(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, AUTO_SCAN_KEY);
  return row?.value === '1';
}

export async function setAutoScanEnabled(db: SQLiteDatabase, enabled: boolean): Promise<void> {
  await db.runAsync(
    `INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    AUTO_SCAN_KEY,
    enabled ? '1' : '0'
  );
}

export async function getOnboardingCompleted(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, ONBOARDING_COMPLETED_KEY);
  return row !== null;
}

export async function setOnboardingCompleted(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(
    `INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ONBOARDING_COMPLETED_KEY,
    String(Date.now())
  );
}
