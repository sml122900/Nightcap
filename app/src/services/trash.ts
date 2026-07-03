import { File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { SQLiteDatabase } from 'expo-sqlite';

const TRASH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

let pendingDeleteSync: Promise<void> | null = null;

/**
 * 사진첩 원본 일괄 삭제 (PROJECT.md §8). 세션 종료 시와 앱 시작(강제종료 복원) 양쪽에서
 * 같은 함수를 호출한다 — "이번 세션의 drop만" 필터링하지 않는 것 자체가 재시도 요구사항을
 * 만족시킨다. 목데이터는 asset_id가 항상 NULL이라 지금은 사실상 no-op (실제 캡처
 * 파이프라인이 생기기 전까지).
 */
export function syncPendingAssetDeletes(db: SQLiteDatabase): Promise<void> {
  if (pendingDeleteSync) return pendingDeleteSync;
  pendingDeleteSync = run().finally(() => {
    pendingDeleteSync = null;
  });
  return pendingDeleteSync;

  async function run() {
    const rows = await db.getAllAsync<{ id: string; asset_id: string }>(
      `SELECT id, asset_id FROM captures WHERE deleted_at IS NOT NULL AND asset_id IS NOT NULL`
    );
    if (rows.length === 0) return;

    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        console.warn('[trash] MediaLibrary permission not granted — will retry next session');
        return;
      }
      await MediaLibrary.Asset.delete(rows.map((r) => new MediaLibrary.Asset(r.asset_id)));
      const ids = rows.map((r) => r.id);
      await db.runAsync(
        `UPDATE captures SET asset_id = NULL WHERE id IN (${ids.map(() => '?').join(',')})`,
        ...ids
      );
    } catch (err) {
      console.warn('[trash] batch photo delete failed, will retry next session', err);
    }
  }
}

/**
 * 앱 시작 시 purge: deleted_at이 7일 지난 행의 앱 샌드박스 이미지 파일을 삭제한다.
 * 행 자체는 통계용으로 유지(§7/§8). 목데이터는 image_uri가 항상 NULL이라 no-op.
 */
export async function purgeExpiredTrash(db: SQLiteDatabase): Promise<void> {
  const cutoff = Date.now() - TRASH_WINDOW_MS;
  const rows = await db.getAllAsync<{ id: string; image_uri: string }>(
    `SELECT id, image_uri FROM captures WHERE deleted_at IS NOT NULL AND deleted_at < ? AND image_uri IS NOT NULL`,
    cutoff
  );
  if (rows.length === 0) return;

  for (const row of rows) {
    try {
      const file = new File(row.image_uri);
      if (file.exists) file.delete();
    } catch (err) {
      console.warn('[trash] failed to purge image file', row.id, err);
    }
  }

  const ids = rows.map((r) => r.id);
  await db.runAsync(
    `UPDATE captures SET image_uri = NULL WHERE id IN (${ids.map(() => '?').join(',')})`,
    ...ids
  );
}
