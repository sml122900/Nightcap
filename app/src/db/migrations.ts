import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Versioned schema migrations (PRAGMA user_version-gated). There is no legacy
 * shipped schema anywhere — migration 1 is the initial versioned schema, not a
 * transform of existing data. Extends PROJECT.md §7 with `kind`/`channel`/`progress`,
 * which the UI needs to render a card (§7 alone can't distinguish video/text,
 * has no channel-handle field distinct from `source_url`, and no watch-progress).
 */
const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE captures (
        id            TEXT PRIMARY KEY,
        created_at    INTEGER NOT NULL,
        triaged_at    INTEGER,
        deleted_at    INTEGER,
        image_uri     TEXT,
        asset_id      TEXT,
        source_app    TEXT,
        source_url    TEXT,
        title         TEXT,
        stars         REAL,
        verdict       TEXT CHECK(verdict IN ('rated','hold','drop')),
        held_count    INTEGER DEFAULT 0,
        is_drm        INTEGER DEFAULT 0,
        kind          TEXT NOT NULL DEFAULT 'video' CHECK(kind IN ('video','text','drm')),
        channel       TEXT,
        progress      TEXT
      );
      CREATE INDEX idx_captures_stack ON captures(triaged_at) WHERE triaged_at IS NULL;
      CREATE INDEX idx_captures_stars ON captures(stars, triaged_at);
      CREATE INDEX idx_captures_trash ON captures(deleted_at) WHERE deleted_at IS NOT NULL;
    `,
  },
  {
    // Adds the screenshot-scan pipeline's storage needs: `meta` holds the scan watermark
    // (key 'last_scan_at'), and the unique index lets scan inserts use INSERT OR IGNORE to
    // dedupe re-scanned assets (SQLite treats NULLs as distinct, so mock/unscanned rows
    // with asset_id NULL never collide with each other).
    version: 2,
    sql: `
      CREATE TABLE meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE UNIQUE INDEX idx_captures_asset_id ON captures(asset_id) WHERE asset_id IS NOT NULL;
    `,
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (const migration of MIGRATIONS) {
    if (migration.version > current) {
      await db.execAsync(migration.sql);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    }
  }
}
