import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { ShareIntent, ShareIntentFile } from 'expo-share-intent';
import { SQLiteDatabase } from 'expo-sqlite';
import { sourceAppFromUrl } from '../constants/sourceApps';
import { copyToSandbox, isLikelyDrm } from './screenshotScan';

const TITLE_MAX_LEN = 120;

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, buffer);
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

  await db.runAsync(
    `INSERT OR IGNORE INTO captures (id, created_at, image_uri, content_hash, is_drm, kind)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    Date.now(),
    destFile.uri,
    contentHash,
    isDrm ? 1 : 0,
    isDrm ? 'drm' : 'video'
  );
}

/** Best-effort title candidate from shared text — falls through to the URL itself if the text IS the URL. */
function titleFromText(text: string | null | undefined, url: string | null): string | null {
  const trimmed = text?.trim();
  if (!trimmed || trimmed === url) return null;
  return trimmed.length > TITLE_MAX_LEN ? `${trimmed.slice(0, TITLE_MAX_LEN)}…` : trimmed;
}

async function ingestUrlOrText(
  db: SQLiteDatabase,
  params: { url: string | null; text: string | null; metaTitle: string | null }
): Promise<void> {
  const { url, text, metaTitle } = params;
  const id = Crypto.randomUUID();
  const sourceApp = url ? sourceAppFromUrl(url) : null;
  const title = metaTitle ?? titleFromText(text, url) ?? url ?? text ?? '';

  await db.runAsync(
    `INSERT INTO captures (id, created_at, source_app, source_url, title, kind)
     VALUES (?, ?, ?, ?, ?, 'text')`,
    id,
    Date.now(),
    sourceApp,
    url,
    title
  );
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
