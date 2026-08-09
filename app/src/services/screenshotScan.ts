import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { SQLiteDatabase } from 'expo-sqlite';
import { getColors } from 'react-native-image-colors';
import { DRM_LUMINANCE_THRESHOLD } from '../constants/drm';
import { mergeClipboardUrl } from './clipboardLink';
import { getAutoScanEnabled, setAutoScanEnabled } from './settings';

const CAPTURES_DIR_NAME = 'captures';
const LAST_SCAN_KEY = 'last_scan_at';

/**
 * The only shape the app should reason about. Android 14+ has three states, not two, and the
 * two-state reading is actively wrong: under `limited` the OS grants
 * `READ_MEDIA_VISUAL_USER_SELECTED` while `READ_MEDIA_IMAGES` stays denied, so anything keying off
 * that single permission calls a granted user "denied"
 * (docs/decisions/android15-limited-media-access.md).
 *
 * - `all`     — full library. The scan works as designed.
 * - `limited` — only the assets the user picked. Real access, but a *newly taken* screenshot can
 *               never be in that set, so auto-scan produces nothing until they widen it.
 * - `none`    — denied. The scan silently no-ops.
 */
export type MediaAccess = 'all' | 'limited' | 'none';

function toAccess(permission: MediaLibrary.PermissionResponse): MediaAccess {
  if (!permission.granted) return 'none';
  return permission.accessPrivileges === 'limited' ? 'limited' : 'all';
}

export async function getMediaAccess(): Promise<MediaAccess> {
  return toAccess(await MediaLibrary.getPermissionsAsync(false, ['photo']));
}

export async function requestMediaAccess(): Promise<MediaAccess> {
  return toAccess(await MediaLibrary.requestPermissionsAsync(false, ['photo']));
}

/** What a screen needs to render the toggle *and* the limited-access notice from one call. */
export interface AutoScanState {
  enabled: boolean;
  access: MediaAccess;
}

/**
 * Turning auto-scan on IS a request for photo access, so the stored flag has to follow what the
 * user actually granted — storing `true` after a denial makes the settings screen lie.
 *
 * `limited` counts as on. The user really does have access and their picked photos really are
 * collected; forcing the toggle off there would be a different lie. The gap (new screenshots aren't
 * seen) is communicated by the notice instead.
 */
export async function setAutoScanRequested(db: SQLiteDatabase, wanted: boolean): Promise<AutoScanState> {
  if (!wanted) {
    await setAutoScanEnabled(db, false);
    return { enabled: false, access: await getMediaAccess() };
  }
  const access = await requestMediaAccess();
  const enabled = access !== 'none';
  await setAutoScanEnabled(db, enabled);
  return { enabled, access };
}

/**
 * Access can be revoked from the system settings while the app is backgrounded, so the stored flag
 * goes stale without the app ever being told. Re-checks and *persists* the correction — leaving it
 * as screen-local state would let the next launch resurrect the stale `true`.
 *
 * Only `none` forces the flag off; `limited` leaves the stored value alone.
 */
export async function syncAutoScanWithPermission(db: SQLiteDatabase): Promise<AutoScanState> {
  const access = await getMediaAccess();
  const stored = await getAutoScanEnabled(db);
  if (!stored) return { enabled: false, access };
  if (access !== 'none') return { enabled: true, access };
  await setAutoScanEnabled(db, false);
  return { enabled: false, access };
}

// `presentAccessPicker` (MediaLibrary.presentPermissionsPicker) used to live here as the way to
// widen `limited` → `all`. Removed: on Android the native side just calls `requestPermissions()`
// again, which shows nothing once the user has made any choice, so the button it powered was a
// silent no-op exactly when it was needed. `LimitedAccessNotice` opens the app's system settings
// instead — see that file and docs/decisions/android15-limited-media-access.md.

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
    // `limited` still runs: the user's picked assets are legitimately scannable. It just can't
    // see anything taken after the fact, which the UI explains rather than this function refusing.
    if ((await getMediaAccess()) === 'none') return;

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
