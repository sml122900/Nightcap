/**
 * URL host → 출처 앱 이름. Isolated here (not inline in shareIntake.ts) so new hosts are a
 * one-line addition, per PROJECT.md §3 (share-sheet ingestion).
 */
const HOST_TO_SOURCE_APP: Record<string, string> = {
  'youtube.com': '유튜브',
  'www.youtube.com': '유튜브',
  'm.youtube.com': '유튜브',
  'youtu.be': '유튜브',
  'instagram.com': '인스타',
  'www.instagram.com': '인스타',
  'netflix.com': '넷플릭스',
  'www.netflix.com': '넷플릭스',
  'tiktok.com': '틱톡',
  'www.tiktok.com': '틱톡',
  'twitter.com': 'X',
  'x.com': 'X',
};

export function sourceAppFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return HOST_TO_SOURCE_APP[host] ?? null;
  } catch {
    return null;
  }
}
