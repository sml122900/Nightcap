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

function xStatusHandle(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'x.com' && host !== 'twitter.com') return null;
  const match = parsed.pathname.match(/^\/([^/]+)\/status\//);
  return match ? match[1] : null;
}

/**
 * Title fallback for hosts where oEmbed/og fetch (services/urlMetadata.ts) routinely fails behind
 * a login wall (docs/decisions/url-metadata-fetch.md) — a minimal type label parsed from the URL
 * path alone, no network involved.
 */
export function fallbackLabelFromUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname;

  if (host === 'instagram.com') {
    if (/^\/reel\//.test(path)) return '릴스';
    if (/^\/p\//.test(path)) return '게시물';
    return null;
  }
  const handle = xStatusHandle(url);
  return handle ? `X 게시물 · @${handle}` : null;
}

/**
 * X's oEmbed/og fetch is essentially always blocked, so the @handle from the URL path itself is
 * the only reliable "게시자" — used regardless of whether the metadata fetch otherwise succeeded.
 */
export function xAuthorFromUrl(url: string): string | null {
  const handle = xStatusHandle(url);
  return handle ? `@${handle}` : null;
}
