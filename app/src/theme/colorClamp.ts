/**
 * Clamping for colors extracted from cover art (`react-native-image-colors`), per 핸드오프 §3.
 *
 * A dominant color pulled off a screenshot is unconstrained — it can be neon, or near-white, or
 * near-black — so it can't be trusted against a fixed text color. Rules, in order:
 *   1. extracted color is a BACKGROUND TINT only, never text/icon color;
 *   2. clamp saturation to `MAX_SATURATION` and remap lightness into the mode's band;
 *   3. if it still fails 4.5:1 against the text color, throw it away and use `surface`.
 * Fallback is the default, not the error path.
 *
 * Pure functions, no RN imports — see colorClamp.test.ts.
 */

export const MAX_SATURATION = 0.5;
/** Lightness bands the tint is remapped into, so it always reads as "surface, faintly colored". */
export const LIGHTNESS_BAND = {
  dark: { min: 0.12, max: 0.28 },
  light: { min: 0.82, max: 0.94 },
} as const;
export const MIN_CONTRAST = 4.5;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Accepts `#rgb`, `#rrggbb`, `#aarrggbb` (image-colors on Android returns the latter). */
export function parseHex(hex: string): Rgb | null {
  const raw = hex.trim().replace(/^#/, '');
  let body: string;
  if (raw.length === 3) body = raw.replace(/./g, (ch) => ch + ch);
  else if (raw.length === 6) body = raw;
  else if (raw.length === 8) body = raw.slice(2);
  else return null;
  if (!/^[0-9a-fA-F]{6}$/.test(body)) return null;
  return {
    r: parseInt(body.slice(0, 2), 16) / 255,
    g: parseInt(body.slice(2, 4), 16) / 255,
    b: parseInt(body.slice(4, 6), 16) / 255,
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return { r: r + m, g: g + m, b: b + m };
}

/** WCAG relative luminance. */
export function luminance({ r, g, b }: Rgb): number {
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio, 1..21. Order-independent. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Returns a safe background tint, or `null` when the extracted color can't be made safe and the
 * caller should fall back to `surface`. `mode` is the *painting* mode — a cinema surface passes
 * `'dark'`.
 */
export function clampTint(extracted: string | null | undefined, mode: 'dark' | 'light', textColor: string): string | null {
  if (!extracted) return null;
  const rgb = parseHex(extracted);
  const text = parseHex(textColor);
  if (!rgb || !text) return null;

  const { h, s, l } = rgbToHsl(rgb);
  const band = LIGHTNESS_BAND[mode];
  const clamped = hslToRgb(h, Math.min(s, MAX_SATURATION), band.min + l * (band.max - band.min));

  return contrastRatio(clamped, text) >= MIN_CONTRAST ? toHex(clamped) : null;
}
