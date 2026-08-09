import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { ShareIntent, ShareIntentFile } from 'expo-share-intent';
import { SQLiteDatabase } from 'expo-sqlite';
import { enqueueWrite } from '../db/writeQueue';
import { fallbackLabelFromUrl, sourceAppFromUrl, xAuthorFromUrl } from '../constants/sourceApps';
import { mergeClipboardUrl } from './clipboardLink';
import { copyToSandbox, downloadToSandbox, isLikelyDrm } from './screenshotScan';
import { fetchUrlMetadata } from './urlMetadata';

const TITLE_MAX_LEN = 120;

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  // Crypto.digest expects a TypedArray view, not a raw ArrayBuffer — passing the ArrayBuffer
  // straight through fails on Android with "no ArrayBuffer attached" (expo-crypto SDK57).
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(buffer));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function ingestImageFile(db: SQLiteDatabase, file: ShareIntentFile): Promise<void> {
  const id = Crypto.randomUUID();
  const safeName = `${id}_${file.fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const destFile = await copyToSandbox(file.path, safeName);
  const contentHash = await hashFile(destFile);
  const isDrm = await isLikelyDrm(destFile.uri);

  const inserted = await db.runAsync(
    `INSERT OR IGNORE INTO captures (id, created_at, image_uri, content_hash, is_drm, kind, intake_source)
     VALUES (?, ?, ?, ?, ?, ?, 'share_image')`,
    id,
    Date.now(),
    destFile.uri,
    contentHash,
    isDrm ? 1 : 0,
    isDrm ? 'drm' : 'video'
  );

  // A shared image carries no link of its own — same structural gap as a screenshot (W3-3 C).
  if (inserted.changes > 0) await mergeClipboardUrl(db, id);
}

/** Best-effort title candidate from shared text — falls through to the URL itself if the text IS the URL. */
function titleFromText(text: string | null | undefined, url: string | null): string | null {
  const trimmed = text?.trim();
  if (!trimmed || trimmed === url) return null;
  return trimmed.length > TITLE_MAX_LEN ? `${trimmed.slice(0, TITLE_MAX_LEN)}…` : trimmed;
}

/**
 * Runs after the row is already inserted and visible — never awaited by the caller, so a slow
 * or offline network can't delay the card showing up (docs/decisions/url-metadata-fetch.md).
 * `hadTextTitle` gates the instagram/X path-pattern fallback: it should only kick in when we had
 * nothing better (no sender-provided title, no usable shared text) to begin with.
 */
async function enrichLinkCapture(db: SQLiteDatabase, id: string, url: string, hadTextTitle: boolean): Promise<void> {
  try {
    const metadata = await fetchUrlMetadata(url);
    // X's public metadata endpoints are essentially always blocked, so the URL-parsed @handle
    // is used unconditionally rather than only as a last-resort fallback (docs/decisions/url-metadata-fetch.md).
    const author = xAuthorFromUrl(url) ?? metadata?.author ?? null;
    const title = metadata?.title ?? (hadTextTitle ? null : fallbackLabelFromUrl(url));

    if (title || author) {
      const sets = [title ? 'title = ?' : null, author ? 'source_author = ?' : null].filter(Boolean);
      const values = [title, author].filter((v): v is string => v !== null);
      await enqueueWrite(id, async () => {
        await db.runAsync(`UPDATE captures SET ${sets.join(', ')} WHERE id = ?`, ...values, id);
      });
    }

    if (metadata?.thumbnailUrl) {
      try {
        const destFile = await downloadToSandbox(metadata.thumbnailUrl, `${id}_thumb.jpg`);
        await enqueueWrite(id, async () => {
          await db.runAsync(`UPDATE captures SET image_uri = ? WHERE id = ?`, destFile.uri, id);
        });
      } catch (err) {
        console.warn('[shareIntake] thumbnail download failed', err);
      }
    }
  } catch (err) {
    console.warn('[shareIntake] link metadata enrich failed', err);
  }
}

async function ingestUrlOrText(
  db: SQLiteDatabase,
  params: { url: string | null; text: string | null; metaTitle: string | null }
): Promise<void> {
  const { url, text, metaTitle } = params;
  const id = Crypto.randomUUID();
  const sourceApp = url ? sourceAppFromUrl(url) : null;
  const textCandidate = titleFromText(text, url);
  const title = metaTitle ?? textCandidate ?? url ?? text ?? '';

  await db.runAsync(
    `INSERT INTO captures (id, created_at, source_app, source_url, title, kind, intake_source, has_link)
     VALUES (?, ?, ?, ?, ?, 'text', 'share_url', ?)`,
    id,
    Date.now(),
    sourceApp,
    url,
    title,
    url ? 1 : 0
  );

  if (url) {
    void enrichLinkCapture(db, id, url, !!(metaTitle ?? textCandidate));
  }
}

/**
 * Turns a received share-sheet intent into `captures` row(s) — the new primary ingestion path
 * (docs/decisions/share-intent-primary-ingestion.md). Mirrors scanNewScreenshots' "never throw"
 * rule: a failed item is logged and skipped rather than crashing the caller.
 */
export async function ingestShareIntent(db: SQLiteDatabase, shareIntent: ShareIntent): Promise<void> {
  const imageFiles = (shareIntent.files ?? []).filter((f) => f.mimeType.startsWith('image/'));
  for (const file of imageFiles) {
    try {
      await ingestImageFile(db, file);
    } catch (err) {
      console.warn('[shareIntake] image ingest failed', err);
    }
  }

  const url = shareIntent.webUrl;
  const text = shareIntent.text;
  if (url || text) {
    try {
      await ingestUrlOrText(db, { url, text: text ?? null, metaTitle: shareIntent.meta?.title ?? null });
    } catch (err) {
      console.warn('[shareIntake] url/text ingest failed', err);
    }
  }
}
