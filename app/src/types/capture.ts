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
}

export type Verdict = 'hold' | 'drop' | 'rate';

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
  hold: number;
  drop: number;
  apps: Record<string, number>;
}
