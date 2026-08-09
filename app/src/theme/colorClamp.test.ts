/**
 * Run with `npm test` (app/). Compiles this module + colorClamp.ts with tsc and runs them under
 * node:test — no jest, because colorClamp is pure TS with no React Native imports and nothing else
 * in the project needs a test runner yet.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIGHTNESS_BAND,
  MAX_SATURATION,
  MIN_CONTRAST,
  clampTint,
  contrastRatio,
  parseHex,
  rgbToHsl,
  toHex,
} from './colorClamp';

const DARK_TEXT = '#ECEFF5';
const LIGHT_TEXT = '#16181D';

test('parseHex accepts 3/6/8-digit forms and rejects junk', () => {
  assert.deepEqual(parseHex('#fff'), { r: 1, g: 1, b: 1 });
  assert.deepEqual(parseHex('000000'), { r: 0, g: 0, b: 0 });
  // Android image-colors returns #AARRGGBB — alpha is dropped, not treated as red.
  assert.deepEqual(parseHex('#FFFF0000'), parseHex('#FF0000'));
  assert.equal(parseHex('#12345'), null);
  assert.equal(parseHex('nope'), null);
});

test('contrastRatio matches the WCAG extremes', () => {
  assert.equal(contrastRatio({ r: 1, g: 1, b: 1 }, { r: 0, g: 0, b: 0 }), 21);
  assert.equal(contrastRatio({ r: 1, g: 1, b: 1 }, { r: 1, g: 1, b: 1 }), 1);
});

test('clamps saturation and remaps lightness into the dark band', () => {
  // Fully saturated neon, mid lightness — must come back desaturated and dark.
  const tint = clampTint('#FF00FF', 'dark', DARK_TEXT);
  assert.ok(tint, 'neon magenta should survive as a dark tint');
  const hsl = rgbToHsl(parseHex(tint!)!);
  assert.ok(hsl.s <= MAX_SATURATION + 1e-6, `saturation ${hsl.s} exceeded cap`);
  assert.ok(hsl.l >= LIGHTNESS_BAND.dark.min - 1e-6 && hsl.l <= LIGHTNESS_BAND.dark.max + 1e-6);
});

test('remaps into the light band when painting light', () => {
  const tint = clampTint('#FF00FF', 'light', LIGHT_TEXT);
  assert.ok(tint);
  const hsl = rgbToHsl(parseHex(tint!)!);
  assert.ok(hsl.l >= LIGHTNESS_BAND.light.min - 1e-6 && hsl.l <= LIGHTNESS_BAND.light.max + 1e-6);
});

test('a near-white cover cannot drag a dark surface light', () => {
  const tint = clampTint('#FFFFFF', 'dark', DARK_TEXT);
  assert.ok(tint);
  assert.ok(contrastRatio(parseHex(tint!)!, parseHex(DARK_TEXT)!) >= MIN_CONTRAST);
});

test('a near-black cover cannot drag a light surface dark', () => {
  const tint = clampTint('#000000', 'light', LIGHT_TEXT);
  assert.ok(tint);
  assert.ok(contrastRatio(parseHex(tint!)!, parseHex(LIGHT_TEXT)!) >= MIN_CONTRAST);
});

test('every clamped tint clears 4.5:1 against its text color, or is discarded', () => {
  for (let h = 0; h < 360; h += 7) {
    for (const l of [0, 0.15, 0.35, 0.5, 0.65, 0.85, 1]) {
      for (const s of [0, 0.3, 0.7, 1]) {
        const hex = toHex(hslToRgbLocal(h, s, l));
        for (const [mode, text] of [
          ['dark', DARK_TEXT],
          ['light', LIGHT_TEXT],
        ] as const) {
          const tint = clampTint(hex, mode, text);
          if (tint === null) continue; // discarded → caller uses `surface`, which is safe by construction
          const ratio = contrastRatio(parseHex(tint)!, parseHex(text)!);
          assert.ok(ratio >= MIN_CONTRAST, `${hex} → ${tint} in ${mode} was only ${ratio.toFixed(2)}:1`);
        }
      }
    }
  }
});

test('falls back (null) on missing or unparseable input', () => {
  assert.equal(clampTint(null, 'dark', DARK_TEXT), null);
  assert.equal(clampTint(undefined, 'dark', DARK_TEXT), null);
  assert.equal(clampTint('', 'dark', DARK_TEXT), null);
  assert.equal(clampTint('rgb(1,2,3)', 'dark', DARK_TEXT), null);
});

/** Local copy so the sweep generates inputs without depending on the function under test's export surface. */
function hslToRgbLocal(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: r + m, g: g + m, b: b + m };
}
