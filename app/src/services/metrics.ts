import { SQLiteDatabase } from 'expo-sqlite';
import { enqueueWrite } from '../db/writeQueue';

const WINDOW_DAYS = 14;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Which per-session counter a committed verdict bumps. */
export type SessionCounter = 'kept' | 'deferred' | 'deleted';

/** Serialization key for one session's row — same queue discipline as capture writes. */
function sessionKey(sessionId: number): string {
  return `session:${sessionId}`;
}

/**
 * Opens a triage session row at screen entry. Awaited (unlike the counter bumps) because every
 * later write needs the row id.
 */
export async function startTriageSession(db: SQLiteDatabase, totalCards: number): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO triage_sessions (started_at, total_cards) VALUES (?, ?)`,
    Date.now(),
    totalCards
  );
  return result.lastInsertRowId;
}

/**
 * `delta` is signed: a '이전'(undo) decrements the same counter the original verdict incremented,
 * so the ratio stays honest when the user walks a card back.
 */
export function bumpSessionCounter(
  db: SQLiteDatabase,
  sessionId: number,
  counter: SessionCounter,
  delta: number
): void {
  void enqueueWrite(sessionKey(sessionId), async () => {
    await db.runAsync(`UPDATE triage_sessions SET ${counter} = ${counter} + ? WHERE id = ?`, delta, sessionId);
  }).catch((err) => console.warn('[metrics] counter bump failed', err));
}

/** A mid-session scan merge grows the denominator — otherwise total_cards understates the session. */
export function addSessionCards(db: SQLiteDatabase, sessionId: number, delta: number): void {
  void enqueueWrite(sessionKey(sessionId), async () => {
    await db.runAsync(`UPDATE triage_sessions SET total_cards = total_cards + ? WHERE id = ?`, delta, sessionId);
  }).catch((err) => console.warn('[metrics] total_cards bump failed', err));
}

/**
 * Closes the session. `completed` distinguishes "reached the done screen" from "walked away",
 * which is the whole point of the drop-off signal — so a second call (e.g. unmount right after
 * the done screen) must not overwrite a completed=1 row with completed=0.
 */
export function endTriageSession(db: SQLiteDatabase, sessionId: number, completed: boolean): void {
  void enqueueWrite(sessionKey(sessionId), async () => {
    await db.runAsync(
      `UPDATE triage_sessions SET ended_at = ?, completed = ? WHERE id = ? AND ended_at IS NULL`,
      Date.now(),
      completed ? 1 : 0,
      sessionId
    );
  }).catch((err) => console.warn('[metrics] session end failed', err));
}

export interface IntakeBucket {
  source: string;
  count: number;
}

export interface MetricsSummary {
  windowDays: number;
  sessions: number;
  sessionsPerDay: number;
  completedSessions: number;
  /** deferred / (kept + deferred + deleted) across the window; null until anything was triaged */
  deferRatio: number | null;
  medianDurationMs: number | null;
  captures: number;
  intake: IntakeBucket[];
  /** has_link=1 share of captures in the window; null when there are none */
  linkRatio: number | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Read model for the settings screen's dogfooding section — literal numbers, no charts (W3-3 A-3). */
export async function getMetricsSummary(db: SQLiteDatabase): Promise<MetricsSummary> {
  const cutoff = Date.now() - WINDOW_MS;

  const sessions = await db.getAllAsync<{
    started_at: number;
    ended_at: number | null;
    completed: number;
    kept: number;
    deferred: number;
    deleted: number;
  }>(
    `SELECT started_at, ended_at, completed, kept, deferred, deleted
     FROM triage_sessions WHERE started_at >= ?`,
    cutoff
  );

  const intake = await db.getAllAsync<{ source: string | null; count: number }>(
    `SELECT intake_source AS source, COUNT(*) AS count FROM captures
     WHERE created_at >= ? GROUP BY intake_source ORDER BY count DESC`,
    cutoff
  );

  const links = await db.getFirstAsync<{ total: number; linked: number }>(
    `SELECT COUNT(*) AS total, SUM(has_link) AS linked FROM captures WHERE created_at >= ?`,
    cutoff
  );

  const triaged = sessions.reduce((sum, s) => sum + s.kept + s.deferred + s.deleted, 0);
  const deferred = sessions.reduce((sum, s) => sum + s.deferred, 0);
  const durations = sessions
    .filter((s) => s.ended_at !== null)
    .map((s) => (s.ended_at as number) - s.started_at);
  const captures = links?.total ?? 0;

  return {
    windowDays: WINDOW_DAYS,
    sessions: sessions.length,
    sessionsPerDay: sessions.length / WINDOW_DAYS,
    completedSessions: sessions.filter((s) => s.completed === 1).length,
    deferRatio: triaged === 0 ? null : deferred / triaged,
    medianDurationMs: median(durations),
    captures,
    intake: intake.map((row) => ({ source: row.source ?? '미상', count: row.count })),
    linkRatio: captures === 0 ? null : (links?.linked ?? 0) / captures,
  };
}
