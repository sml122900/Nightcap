import { Capture, CaptureKind, Verdict } from '../types/capture';

/** Raw `captures` table row shape. DB-only fields never leak past the db layer. */
export interface CaptureRow {
  id: string;
  created_at: number;
  triaged_at: number | null;
  deleted_at: number | null;
  image_uri: string | null;
  asset_id: string | null;
  source_app: string | null;
  source_url: string | null;
  title: string | null;
  stars: number | null;
  verdict: 'rated' | 'hold' | 'drop' | null;
  held_count: number;
  is_drm: number;
  kind: CaptureKind;
  channel: string | null;
  progress: string | null;
}

/** DB verdict column value ↔ UI Verdict ('rate' is the swipe-engine's action verb). */
export function verdictToDb(verdict: Verdict): 'rated' | 'drop' {
  return verdict === 'rate' ? 'rated' : verdict;
}

export function timeLabelFrom(createdAtMs: number): string {
  const d = new Date(createdAtMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Maps a DB row to the UI-facing Capture shape used throughout the triage/library/trash screens. */
export function rowToCapture(row: CaptureRow): Capture {
  return {
    id: row.id,
    app: row.source_app ?? '',
    time: timeLabelFrom(row.created_at),
    title: row.title ?? '',
    src: row.channel ?? '',
    kind: row.kind,
    progress: (row.progress as Capture['progress']) ?? undefined,
  };
}
