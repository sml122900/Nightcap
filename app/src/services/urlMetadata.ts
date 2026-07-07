import { decodeHtmlEntities } from '../utils/htmlEntities';

const FETCH_TIMEOUT_MS = 3000;
const YOUTUBE_HOSTS = ['youtube.com', 'm.youtube.com', 'youtu.be'];
// Straight or curly closing/opening quotes — Instagram's web og:title uses curly quotes.
const INSTAGRAM_TITLE_PATTERN = /^(.+?) on Instagram:\s*["“]([\s\S]*)["”]\s*$/;

export interface UrlMetadata {
  title: string | null;
  thumbnailUrl: string | null;
  author: string | null;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res.ok ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url: string): Promise<any | null> {
  const res = await fetchWithTimeout(url);
  if (!res) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NightcapBot/1.0)' } });
  if (!res) return null;
  try {
    return await res.text();
  } catch {
    return null;
  }
}

function extractMetaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i'),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return null;
}

function extractOembedLink(html: string): string | null {
  const patterns = [
    /<link[^>]+type=["']application\/json\+oembed["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]*type=["']application\/json\+oembed["']/i,
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return null;
}

function metadataFromOembedJson(json: any): UrlMetadata | null {
  if (!json?.title) return null;
  return {
    title: decodeHtmlEntities(json.title),
    thumbnailUrl: json.thumbnail_url ?? null,
    author: json.author_name ? decodeHtmlEntities(json.author_name) : null,
  };
}

async function fetchYoutubeOembed(url: string): Promise<UrlMetadata | null> {
  return metadataFromOembedJson(await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`));
}

async function fetchOembedFromHtml(html: string): Promise<UrlMetadata | null> {
  const oembedUrl = extractOembedLink(html);
  if (!oembedUrl) return null;
  return metadataFromOembedJson(await fetchJson(oembedUrl));
}

function extractOpenGraph(html: string): UrlMetadata | null {
  const title = extractMetaContent(html, 'og:title');
  const thumbnailUrl = extractMetaContent(html, 'og:image');
  const author = extractMetaContent(html, 'og:site_name');
  return title || thumbnailUrl ? { title, thumbnailUrl, author } : null;
}

/** Instagram's og:title is `"{author} on Instagram: "{caption}""` — split it, or fall back to the raw text as-is. */
function splitInstagramTitle(metadata: UrlMetadata): UrlMetadata {
  if (!metadata.title) return metadata;
  const match = metadata.title.match(INSTAGRAM_TITLE_PATTERN);
  if (!match) return metadata;
  return { ...metadata, title: match[2].trim(), author: match[1].trim() };
}

/**
 * Best-effort public metadata for a shared URL (docs/decisions/url-metadata-fetch.md) — oEmbed
 * first (YouTube direct, everything else via <link type="application/json+oembed"> discovery),
 * then <meta property="og:*">. Never throws and never returns partial garbage on failure: any
 * network error, timeout, non-2xx, or parse failure just yields null so the caller keeps
 * whatever title it already had.
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata | null> {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }

  if (YOUTUBE_HOSTS.includes(host)) {
    const oembed = await fetchYoutubeOembed(url);
    if (oembed) return oembed;
  }

  const html = await fetchHtml(url);
  if (!html) return null;

  const metadata = (await fetchOembedFromHtml(html)) ?? extractOpenGraph(html);
  if (!metadata) return null;

  return host === 'instagram.com' ? splitInstagramTitle(metadata) : metadata;
}
