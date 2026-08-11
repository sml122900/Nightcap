import * as Clipboard from 'expo-clipboard';
import { SQLiteDatabase } from 'expo-sqlite';
import { sourceAppFromUrl, xAuthorFromUrl } from '../constants/sourceApps';
import { enqueueWrite } from '../db/writeQueue';
import { fetchUrlMetadata } from './urlMetadata';

const LAST_CLIPBOARD_KEY = 'last_clipboard_url';
export const CLIPBOARD_ATTEMPTS_KEY = 'clipboard_merge_attempts';
export const CLIPBOARD_MERGES_KEY = 'clipboard_merge_hits';

const URL_PATTERN = /^https?:\/\/\S+$/i;

async function bumpMetaCounter(db: SQLiteDatabase, key: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO meta (key, value) VALUES (?, '1')
     ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)`,
    key
  );
}

/**
 * Returns the clipboard URL only if it looks *newly copied*, and marks it consumed.
 *
 * There is no clipboard timestamp on Android, so "직전 30분 내 복사" can't be measured directly.
 * The stand-in is change detection: the last URL we acted on is cached in `meta`, and an identical
 * string on the next intake is treated as stale — it's been sitting there since some earlier
 * session and has nothing to do with the screenshot the user just took. That deliberately trades
 * some misses (re-copying the same link) for not polluting captures with a stale link, which is
 * the failure mode that would make the user distrust the feature.
 */
async function consumeFreshClipboardUrl(db: SQLiteDatabase): Promise<string | null> {
  // iOS-only getUrlAsync() would be nicer, but this path has to work on Android — parse the string.
  const raw = (await Clipboard.getStringAsync()).trim();
  if (!URL_PATTERN.test(raw)) return null;

  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, LAST_CLIPBOARD_KEY);
  if (row?.value === raw) return null;

  await db.runAsync(
    `INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    LAST_CLIPBOARD_KEY,
    raw
  );
  return raw;
}

/**
 * Fills in title/게시자 for a capture that got its URL from the clipboard. Unlike the share-link
 * path (services/shareIntake.ts) this never touches `image_uri`: the capture already *is* the
 * screenshot the user took, and replacing it with the link's og:image would throw away the thing
 * they actually captured.
 */
async function enrichFromUrl(db: SQLiteDatabase, captureId: string, url: string): Promise<void> {
  try {
    const metadata = await fetchUrlMetadata(url);
    const author = xAuthorFromUrl(url) ?? metadata?.author ?? null;
    const title = metadata?.title ?? null;
    if (!title && !author) return;

    await enqueueWrite(captureId, async () => {
      await db.runAsync(
        `UPDATE captures
         SET title = COALESCE(NULLIF(title, ''), ?), source_author = COALESCE(source_author, ?)
         WHERE id = ?`,
        title,
        author,
        captureId
      );
    });
  } catch (err) {
    console.warn('[clipboardLink] metadata enrich failed', err);
  }
}

/**
 * Screenshot/image intake has no link of its own, so a pure screenshot can never get back to its
 * source (W3-3 C). If the clipboard is holding a freshly copied URL at that moment, attach it.
 * Never throws — intake must survive a failed merge.
 */
export async function mergeClipboardUrl(db: SQLiteDatabase, captureId: string): Promise<void> {
  try {
    await bumpMetaCounter(db, CLIPBOARD_ATTEMPTS_KEY);
    const url = await consumeFreshClipboardUrl(db);
    if (url === null) return;

    await enqueueWrite(captureId, async () => {
      await db.runAsync(
        `UPDATE captures SET source_url = ?, has_link = 1, source_app = COALESCE(source_app, ?) WHERE id = ?`,
        url,
        sourceAppFromUrl(url),
        captureId
      );
    });
    await bumpMetaCounter(db, CLIPBOARD_MERGES_KEY);
    void enrichFromUrl(db, captureId, url);
  } catch (err) {
    console.warn('[clipboardLink] merge failed', err);
  }
}

/**
 * LibraryDetail's "링크 해제" — a wrongly attached link the user can't remove makes the whole
 * feature untrustworthy. Also clears `source_app`/`source_author`: both are only ever written by
 * URL-derived enrichment (here and shareIntake.ts's `enrichLinkCapture`), never by the user, so
 * leaving them behind after unlinking would strand the gray "유튜브 · ..." source line with
 * nothing backing it. `title` is deliberately left alone — it can legitimately be user-typed
 * (LibraryDetail/TriageScreen's title field), and the schema has no way to tell that apart from
 * a metadata-filled one, so clearing it risks erasing text the user wrote themselves.
 */
export async function unlinkCapture(db: SQLiteDatabase, captureId: string): Promise<void> {
  await db.runAsync(
    `UPDATE captures SET source_url = NULL, has_link = 0, source_app = NULL, source_author = NULL WHERE id = ?`,
    captureId
  );
}
