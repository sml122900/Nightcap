import { SQLiteDatabase } from 'expo-sqlite';
import { decodeHtmlEntities } from '../utils/htmlEntities';

/**
 * Versioned schema migrations (PRAGMA user_version-gated). There is no legacy
 * shipped schema anywhere — migration 1 is the initial versioned schema, not a
 * transform of existing data. Extends PROJECT.md §7 with `kind`/`channel`/`progress`,
 * which the UI needs to render a card (§7 alone can't distinguish video/text,
 * has no channel-handle field distinct from `source_url`, and no watch-progress).
 */
interface Migration {
  version: number;
  /** Raw SQL to exec for this version — most migrations are schema-only. */
  sql?: string;
  /** For migrations that need JS logic (e.g. rewriting existing row data) rather than pure SQL. */
  run?: (db: SQLiteDatabase) => Promise<void>;
}

const MIGRATIONS: Migration[] = [
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
  {
    // Share-sheet image ingestion (services/shareIntake.ts) has no MediaLibrary asset_id to dedupe
    // on, so it hashes the copied file's bytes instead — same partial-unique-index pattern as
    // asset_id above.
    version: 3,
    sql: `
      ALTER TABLE captures ADD COLUMN content_hash TEXT;
      CREATE UNIQUE INDEX idx_captures_content_hash ON captures(content_hash) WHERE content_hash IS NOT NULL;
    `,
  },
  {
    // "게시자" for link-share captures (docs/decisions/url-metadata-fetch.md) — kept separate from
    // the pre-existing `channel` column (mock-seed only) rather than reusing it.
    version: 4,
    sql: `ALTER TABLE captures ADD COLUMN source_author TEXT;`,
  },
  {
    // One-time cleanup: og:title/oEmbed title text scraped before the entity-decode fix
    // (docs/decisions/url-metadata-fetch.md) was stored with raw entities like `&#x4eac;` still
    // in it. Re-decodes anything already saved; the fetch path itself now decodes before saving.
    version: 5,
    run: async (db) => {
      const rows = await db.getAllAsync<{ id: string; title: string | null; source_author: string | null }>(
        `SELECT id, title, source_author FROM captures WHERE title LIKE '%&%' OR source_author LIKE '%&%'`
      );
      for (const row of rows) {
        const title = row.title ? decodeHtmlEntities(row.title) : row.title;
        const author = row.source_author ? decodeHtmlEntities(row.source_author) : row.source_author;
        if (title !== row.title || author !== row.source_author) {
          await db.runAsync(`UPDATE captures SET title = ?, source_author = ? WHERE id = ?`, title, author, row.id);
        }
      }
    },
  },
  {
    // Dogfooding instrumentation (W3-3): the four signals that decide whether W4 gets a floating
    // bubble — session frequency / defer ratio / session duration / screenshot-vs-link mix.
    // `intake_source` is backfilled only where the existing columns make it *certain* (asset_id ⇒
    // scan, content_hash ⇒ shared image, source_url-without-either ⇒ shared link); anything else
    // (mock-seeded rows) stays NULL rather than being guessed at — a guessed value would silently
    // pollute the exact ratio this migration exists to measure.
    version: 6,
    sql: `
      ALTER TABLE captures ADD COLUMN intake_source TEXT;
      ALTER TABLE captures ADD COLUMN has_link INTEGER NOT NULL DEFAULT 0;

      UPDATE captures SET has_link = 1 WHERE source_url IS NOT NULL;
      UPDATE captures SET intake_source = 'screenshot_scan' WHERE asset_id IS NOT NULL;
      UPDATE captures SET intake_source = 'share_image' WHERE asset_id IS NULL AND content_hash IS NOT NULL;
      UPDATE captures SET intake_source = 'share_url'
        WHERE asset_id IS NULL AND content_hash IS NULL AND source_url IS NOT NULL;

      CREATE TABLE triage_sessions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at  INTEGER NOT NULL,
        ended_at    INTEGER,
        completed   INTEGER NOT NULL DEFAULT 0,
        total_cards INTEGER NOT NULL DEFAULT 0,
        kept        INTEGER NOT NULL DEFAULT 0,
        deferred    INTEGER NOT NULL DEFAULT 0,
        deleted     INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_triage_sessions_started ON triage_sessions(started_at);
    `,
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (const migration of MIGRATIONS) {
    if (migration.version > current) {
      if (migration.sql) await db.execAsync(migration.sql);
      if (migration.run) await migration.run(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    }
  }
}
