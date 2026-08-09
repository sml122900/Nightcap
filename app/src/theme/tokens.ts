/**
 * Design tokens — the ONLY place color literals are allowed to live (핸드오프 §2).
 *
 * Naming is role-based, never value-based (`gray900` would become a lie in light mode).
 * Swipe physics (thresholds/rotation/springs) deliberately stay out of here — they live in
 * `constants/swipeEngine.ts` and are untouchable design-wise (핸드오프 §0-4).
 */

export type ResolvedTheme = 'dark' | 'light';
/** What's persisted in `meta.theme_mode`. */
export type ThemeMode = ResolvedTheme | 'system';
/**
 * Which palette a subtree paints with. `theme` follows the user's choice; `cinema` is the
 * theme-independent dark surface used where content is the subject (Triage deck, LibraryDetail's
 * image area); `dark` is a hard pin used by the share card, whose output must not change with
 * the viewer's theme.
 */
export type Surface = 'theme' | 'cinema' | 'dark';

export interface Colors {
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentMuted: string;
  /** Ink that sits ON `accent` (gold is light in dark mode, dark-gold in light — both want dark ink). */
  onAccent: string;
  danger: string;
  dangerMuted: string;
  defer: string;
  deferMuted: string;
  /** Translucent fill for controls layered over imagery (chips, icon buttons). */
  control: string;
  overlay: string;
}

const dark: Colors = {
  bg: '#0B0D12',
  surface: '#14171F',
  surfaceRaised: '#1C2029',
  border: '#262B36',
  textPrimary: '#ECEFF5',
  textSecondary: '#9AA3B2',
  textTertiary: '#626B7B',
  accent: '#F5C451',
  accentMuted: '#3A3120',
  onAccent: '#0B0D12',
  danger: '#E5544B',
  dangerMuted: '#3A1F1D',
  defer: '#5B8DEF',
  deferMuted: '#1E2740',
  control: 'rgba(255,255,255,0.08)',
  overlay: 'rgba(0,0,0,0.72)',
};

const light: Colors = {
  bg: '#FBFAF7',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  border: '#E5E2DB',
  textPrimary: '#16181D',
  textSecondary: '#5C6270',
  textTertiary: '#8B92A0',
  // Darker than the dark-mode gold on purpose: gold loses contrast on white, this holds 4.5:1.
  accent: '#C99400',
  accentMuted: '#F5EBD0',
  onAccent: '#FFFFFF',
  danger: '#C93A31',
  dangerMuted: '#FBE7E5',
  defer: '#3B6FD4',
  deferMuted: '#E6EDFB',
  control: 'rgba(0,0,0,0.05)',
  overlay: 'rgba(0,0,0,0.48)',
};

/** Theme-independent. Content is the subject here; the UI recedes into near-black. */
const cinema: Colors = {
  ...dark,
  bg: '#08090C',
  surface: '#12141A',
  surfaceRaised: '#1A1D25',
  textPrimary: '#ECEFF5',
  textSecondary: '#8A919E',
  control: 'rgba(255,255,255,0.10)',
};

export const palettes: Record<ResolvedTheme | 'cinema', Colors> = { dark, light, cinema };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40 } as const;

export const radius = { chip: 8, card: 12, sheet: 20, full: 999 } as const;

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
}

export const type = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  meta: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '500' },
} as const satisfies Record<string, TypeStyle>;

/** Font scaling stays on, but capped — past ~1.4x the card/deck layouts collapse (핸드오프 §2-2). */
export const MAX_FONT_SCALE = 1.4;

export interface Shadows {
  card: object;
  modal: object;
}

/**
 * Dark surfaces get no shadow at all — invisible against near-black, and still costs a layer.
 * Depth there comes from `surface` → `surfaceRaised` lightness instead (핸드오프 §2-3).
 */
const noShadow: Shadows = { card: {}, modal: {} };

const lightShadow: Shadows = {
  card: {
    elevation: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  modal: {
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
};

export const shadows: Record<ResolvedTheme | 'cinema', Shadows> = {
  dark: noShadow,
  cinema: noShadow,
  light: lightShadow,
};

/** Durations only — swipe springs/thresholds belong to swipeEngine.ts, not here (핸드오프 §2-4). */
export const motion = { fast: 140, base: 220, slow: 380 } as const;

export interface Theme {
  /** The user's stored choice, including `'system'`. */
  mode: ThemeMode;
  /** What the app-level theme resolves to — stays `'light'` even inside a cinema subtree. */
  resolved: ResolvedTheme;
  /** Which palette THIS subtree paints with. */
  palette: ResolvedTheme | 'cinema';
  c: Colors;
  space: typeof space;
  radius: typeof radius;
  type: typeof type;
  shadow: Shadows;
  motion: typeof motion;
}
