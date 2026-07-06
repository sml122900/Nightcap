export type CaptureKind = 'video' | 'text' | 'drm';

export interface Capture {
  id: string;
  app: string;
  time: string;
  title: string;
  src: string;
  kind: CaptureKind;
  /** video watch-progress, e.g. '62%' — video kind only */
  progress?: `${number}%`;
  /** sandbox copy path from the screenshot scan pipeline; absent for mock-seeded captures */
  imageUri?: string;
}

/** Committed, DB-facing outcome — 'hold' isn't one: it's translated to rate@2.5 (see GestureAction). */
export type Verdict = 'drop' | 'rate';

/**
 * Raw swipe/button action before it's translated into a committed Verdict. 'hold' no
 * longer defers the card to tomorrow's stack — it commits an instant rate@2.5, so the
 * card can be triaged without ever opening the rate-mode modal (docs/decisions/hold-becomes-quick-rate.md).
 */
export type GestureAction = 'hold' | 'drop';

export interface TriageHistoryEntry {
  item: Capture;
  verdict: Verdict;
  /** rating 0.5–5.0, only set when verdict === 'rate' */
  stars?: number;
}

export interface TriageSession {
  rated: number;
  /** sum of all star ratings — avg = sum / rated */
  sum: number;
  drop: number;
  apps: Record<string, number>;
}
