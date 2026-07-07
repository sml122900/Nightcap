import { SQLiteDatabase } from 'expo-sqlite';
import { Capture, Verdict } from '../types/capture';
import { CaptureRow, rowToCapture, verdictToDb } from './types';

const TRASH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 오늘의 스택: 미판정(triaged_at NULL) 항목, 생성 시각 순. `held_count`는 더 이상
 * 어디서도 증가시키지 않아(← 스와이프가 즉시 rate@2.5로 커밋됨,
 * docs/decisions/hold-becomes-quick-rate.md) 정렬 기준에서 제외.
 */
export async function getTodayStack(db: SQLiteDatabase): Promise<Capture[]> {
  const rows = await db.getAllAsync<CaptureRow>(
    `SELECT * FROM captures WHERE triaged_at IS NULL ORDER BY created_at ASC`
  );
  return rows.map(rowToCapture);
}

export async function applyVerdict(
  db: SQLiteDatabase,
  id: string,
  verdict: Verdict,
  stars?: number
): Promise<void> {
  const now = Date.now();
  if (verdict === 'drop') {
    await db.runAsync(
      `UPDATE captures SET verdict = ?, triaged_at = ?, deleted_at = ? WHERE id = ?`,
      verdictToDb('drop'),
      now,
      now,
      id
    );
  } else {
    await db.runAsync(
      `UPDATE captures SET verdict = ?, stars = ?, triaged_at = ? WHERE id = ?`,
      verdictToDb('rate'),
      stars ?? null,
      now,
      id
    );
  }
}

/** 오른쪽 스와이프(이전): 직전 판정을 되돌려 카드를 다시 미판정 상태로 되돌림. */
export async function undoVerdict(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE captures SET verdict = NULL, stars = NULL, triaged_at = NULL, deleted_at = NULL WHERE id = ?`,
    id
  );
}

export async function getTodayStackCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM captures WHERE triaged_at IS NULL`
  );
  return row?.count ?? 0;
}

export async function getLibrary(db: SQLiteDatabase, minStars?: number): Promise<(Capture & { stars: number })[]> {
  const rows = minStars
    ? await db.getAllAsync<CaptureRow>(
        `SELECT * FROM captures WHERE verdict = 'rated' AND deleted_at IS NULL AND stars >= ? ORDER BY triaged_at DESC`,
        minStars
      )
    : await db.getAllAsync<CaptureRow>(
        `SELECT * FROM captures WHERE verdict = 'rated' AND deleted_at IS NULL ORDER BY triaged_at DESC`
      );
  return rows.map((row) => ({ ...rowToCapture(row), stars: row.stars ?? 0 }));
}

/**
 * 휴지통: deleted_at으로부터 7일 이내인 항목만(§1 "7일 이내 복원 가능"). image_uri
 * 유무로 거르지 않는다 — 목데이터는 실제 캡처 파이프라인이 없어 image_uri가 항상
 * NULL이라, 그 기준으로 걸렀다면 휴지통 화면이 영구히 비어 검증 자체가 불가능해진다.
 */
export async function getTrash(db: SQLiteDatabase): Promise<(Capture & { deletedAt: number })[]> {
  const cutoff = Date.now() - TRASH_WINDOW_MS;
  const rows = await db.getAllAsync<CaptureRow>(
    `SELECT * FROM captures WHERE deleted_at IS NOT NULL AND deleted_at >= ? ORDER BY deleted_at DESC`,
    cutoff
  );
  return rows.map((row) => ({ ...rowToCapture(row), deletedAt: row.deleted_at as number }));
}

export async function getTrashCount(db: SQLiteDatabase): Promise<number> {
  const cutoff = Date.now() - TRASH_WINDOW_MS;
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM captures WHERE deleted_at IS NOT NULL AND deleted_at >= ?`,
    cutoff
  );
  return row?.count ?? 0;
}

/** 휴지통 복원: 오늘/내일 스택으로 복귀. held_count는 건드리지 않음(보류와는 무관한 상태). */
export async function restoreFromTrash(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE captures SET verdict = NULL, stars = NULL, triaged_at = NULL, deleted_at = NULL WHERE id = ?`,
    id
  );
}
