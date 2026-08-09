import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { SQLiteDatabase } from 'expo-sqlite';
import { getColors } from 'react-native-image-colors';
import { DRM_LUMINANCE_THRESHOLD } from '../constants/drm';
import { mergeClipboardUrl } from './clipboardLink';
import { getAutoScanEnabled, setAutoScanEnabled } from './settings';

const CAPTURES_DIR_NAME = 'captures';
const LAST_SCAN_KEY = 'last_scan_at';

export interface MediaAccessStatus {
  granted: boolean;
  accessPrivileges: 'all' | 'limited' | 'none';
}

function toAccessStatus(permission: MediaLibrary.PermissionResponse): MediaAccessStatus {
  return { granted: permission.granted, accessPrivileges: permission.accessPrivileges ?? 'none' };
}

export async function getMediaAccessStatus(): Promise<MediaAccessStatus> {
  return toAccessStatus(await MediaLibrary.getPermissionsAsync(false, ['photo']));
}

export async function requestMediaAccess(): Promise<MediaAccessStatus> {
  return toAccessStatus(await MediaLibrary.requestPermissionsAsync(false, ['photo']));
}

/**
 * Turning auto-scan on IS a request for photo access, so the stored flag has to follow what the
 * user actually granted. Storing `true` after a denial makes the settings screen lie: the toggle
 * reads "on" while the scan can never run.
 *
 * Returns the value that was persisted, which is what the caller should render.
 */
export async function setAutoScanRequested(db: SQLiteDatabase, wanted: boolean): Promise<boolean> {
  if (!wanted) {
    await setAutoScanEnabled(db, false);
    return false;
  }
  const access = await requestMediaAccess();
  await setAutoScanEnabled(db, access.granted);
  return access.granted;
}

/**
 * Access can be revoked from the system settings while the app is backgrounded, so the stored flag
 * goes stale without the app ever being told. Re-checks and *persists* the correction — leaving it
 * as screen-local state would let the next launch resurrect the stale `true`.
 */
export async function syncAutoScanWithPermission(db: SQLiteDatabase): Promise<boolean> {
  const enabled = await getAutoScanEnabled(db);
  if (!enabled) return false;
  const access = await getMediaAccessStatus();
  if (access.granted) return true;
  await setAutoScanEnabled(db, false);
  return false;
}

/** Android 14+/iOS: re-opens the system picker so a "limited" grant can be widened to "all". */
export async function presentAccessPicker(): Promise<void> {
  await MediaLibrary.presentPermissionsPicker();
}

/**
 * Screenshots album first (works on both platforms for the common case), falling back to a
 * filename check — `Query` can only filter by `AssetField` (creationTime/mediaType/etc), and
 * neither that nor `MediaSubtype.SCREENSHOT` (iOS-only, not a queryable AssetField) can express
 * "screenshot" directly, so this is the cheapest cross-platform approximation available.
 */
async function findScreenshotCandidates(sinceMs: number): Promise<MediaLibrary.AssetMetadata[]> {
  const album = await MediaLibrary.Album.get('Screenshots').catch(() => null);
  if (album) {
    return new MediaLibrary.Query()
      .album(album)
      .gt(MediaLibrary.AssetField.CREATION_TIME, sinceMs)
      .orderBy(MediaLibrary.AssetField.CREATION_TIME)
      .exeForMetadata();
  }
  const images = await new MediaLibrary.Query()
    .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.IMAGE)
    .gt(MediaLibrary.AssetField.CREATION_TIME, sinceMs)
    .orderBy(MediaLibrary.AssetField.CREATION_TIME)
    .exeForMetadata();
  return images.filter((meta) => meta.filename?.toLowerCase().includes('screenshot'));
}

function hexLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Copies a source file (MediaLibrary asset uri or a share-intent temp file uri) into the app
 * sandbox's `captures` dir, so the row survives even if the original is later removed. Shared
 * by the scan pipeline and the share-intent ingestion path (services/shareIntake.ts).
 */
export async function copyToSandbox(sourceUri: string, filename: string): Promise<File> {
  const dir = new Directory(Paths.document, CAPTURES_DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true });
  const destFile = new File(dir, filename);
  await new File(sourceUri).copy(destFile, { overwrite: true });
  return destFile;
}

/**
 * Downloads a remote URL (link-share og:image/oEmbed thumbnail, services/urlMetadata.ts) straight
 * into the app sandbox's `captures` dir — same destination/rationale as copyToSandbox, but for a
 * network source instead of a local one.
 */
export async function downloadToSandbox(url: string, filename: string): Promise<File> {
  const dir = new Directory(Paths.document, CAPTURES_DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true });
  const destFile = new File(dir, filename);
  return File.downloadFileAsync(url, destFile, { idempotent: true });
}

/** PROJECT.md §3.4: near-black average color ⇒ FLAG_SECURE black screen. See constants/drm.ts for threshold caveats. */
export async function isLikelyDrm(uri: string): Promise<boolean> {
  try {
    const result = await getColors(uri, {
      fallback: '#000000',
      pixelSpacing: 5,
      quality: 'low',
      cache: false,
    });
    const hex =
      result.platform === 'ios' ? result.background : result.platform === 'android' ? result.average : result.dominant;
    return hexLuminance(hex) <= DRM_LUMINANCE_THRESHOLD;
  } catch (err) {
    console.warn('[screenshotScan] DRM luminance check failed, defaulting to non-DRM', err);
    return false;
  }
}

async function getWatermark(db: SQLiteDatabase): Promise<number | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ?`,
    LAST_SCAN_KEY
  );
  return row ? Number(row.value) : null;
}

async function setWatermark(db: SQLiteDatabase, value: number): Promise<void> {
  await db.runAsync(
    `INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    LAST_SCAN_KEY,
    String(value)
  );
}

/**
 * Scans for new screenshots since the last watermark, copies them into the app sandbox, and
 * inserts a `captures` row per asset. Never throws — a bad candidate is skipped and retried
 * next scan (see the watermark rule below); this is called from the UI thread on app foreground
 * and must not be able to crash the triage screen (PROJECT.md W3-1 §7 verification list).
 */
export async function scanNewScreenshots(db: SQLiteDatabase): Promise<void> {
  try {
    const access = await getMediaAccessStatus();
    if (!access.granted) return;

    const lastSync = await getWatermark(db);
    if (lastSync === null) {
      // First run ever: start "from now" — don't flood the first triage session with the
      // user's entire camera roll of past screenshots (PROJECT.md §2 spec).
      await setWatermark(db, Date.now());
      return;
    }

    const candidates = await findScreenshotCandidates(lastSync);
    if (candidates.length === 0) return;

    let firstFailureAt: number | null = null;
    let maxSeenAt = lastSync;
    // The clipboard holds at most one link, so it can only belong to one of this batch's
    // screenshots — the first new one. Attaching it to all of them would be a guess (W3-3 C).
    let clipboardOffered = false;

    for (const meta of candidates) {
      if (meta.creationTime === null) continue;
      try {
        const asset = new MediaLibrary.Asset(meta.id);
        const sourceUri = await asset.getUri();
        const extension = meta.filename?.includes('.')
          ? meta.filename.slice(meta.filename.lastIndexOf('.'))
          : '.jpg';
        const safeName = `${meta.id.replace(/[^a-zA-Z0-9]/g, '_')}${extension}`;
        const destFile = await copyToSandbox(sourceUri, safeName);

        const isDrm = await isLikelyDrm(destFile.uri);

        const inserted = await db.runAsync(
          `INSERT OR IGNORE INTO captures (id, created_at, asset_id, image_uri, is_drm, kind, intake_source)
           VALUES (?, ?, ?, ?, ?, ?, 'screenshot_scan')`,
          meta.id,
          meta.creationTime,
          meta.id,
          destFile.uri,
          isDrm ? 1 : 0,
          isDrm ? 'drm' : 'video'
        );

        if (inserted.changes > 0 && !clipboardOffered) {
          clipboardOffered = true;
          await mergeClipboardUrl(db, meta.id);
        }

        maxSeenAt = meta.creationTime;
      } catch (err) {
        console.warn('[screenshotScan] failed to process candidate, will retry next scan', meta.id, err);
        // Keep the watermark before this (and thus every later) candidate so both are
        // reconsidered next scan — successes get skipped harmlessly via the asset_id unique index.
        if (firstFailureAt === null) firstFailureAt = meta.creationTime;
      }
    }

    await setWatermark(db, firstFailureAt !== null ? firstFailureAt - 1 : maxSeenAt);
  } catch (err) {
    console.warn('[screenshotScan] scan failed', err);
  }
}
