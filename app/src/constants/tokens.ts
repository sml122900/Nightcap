/**
 * Design tokens — ported 1:1 from nightcap-prototype.html's :root CSS variables
 * (PROJECT.md §5 is the abridged version; the prototype is the source of truth).
 */
export const tokens = {
  bg: '#000000',
  surface: '#121214',
  surface2: '#1a1a1e',
  surface3: '#26262b',
  border: '#26262b',
  borderStrong: '#34343a',
  text: '#f4f4f5',
  text2: '#8e8e96',
  text3: '#55555c',
  brand: '#f5b942',
  brandDim: 'rgba(245,185,66,.14)',
  danger: '#e5484d',
  dangerDim: 'rgba(229,72,77,.12)',
  neutralDim: 'rgba(255,255,255,.05)',
  radius: 20,
  radiusSm: 12,
} as const;

/** weight/letterSpacing carry visual hierarchy — color does not (PROJECT.md §5). */
export const typography = {
  weight: {
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
  letterSpacingTight: -0.02,
  letterSpacingTighter: -0.05,
} as const;
