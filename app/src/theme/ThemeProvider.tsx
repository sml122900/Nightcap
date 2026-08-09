import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { getThemeMode, setThemeMode as persistThemeMode } from '../services/settings';
import {
  motion,
  palettes,
  radius,
  shadows,
  space,
  type,
  type ResolvedTheme,
  type Surface,
  type Theme,
  type ThemeMode,
} from './tokens';

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function buildTheme(mode: ThemeMode, resolved: ResolvedTheme, palette: ResolvedTheme | 'cinema'): Theme {
  return { mode, resolved, palette, c: palettes[palette], space, radius, type, shadow: shadows[palette], motion };
}

/**
 * Owns the persisted theme choice. Must sit inside SQLiteProvider (the mode lives in `meta`).
 *
 * Children are withheld until the stored mode is read — painting dark and then snapping to light
 * one frame later is the one artifact a theme system must not ship (핸드오프 §1-3).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode | null>(null);

  useEffect(() => {
    getThemeMode(db).then(setModeState);
  }, [db]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      persistThemeMode(db, next);
    },
    [db]
  );

  const value = useMemo<ThemeContextValue | null>(() => {
    if (mode === null) return null;
    const resolved: ResolvedTheme = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
    return { mode, resolved, setMode };
  }, [mode, system, setMode]);

  if (value === null) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * `surface` picks which palette this component paints with:
 *   - `'theme'` (default) follows the user's choice
 *   - `'cinema'` is theme-independent near-black, for surfaces where the content is the subject
 *   - `'dark'` hard-pins dark, for the share card (an output whose look must not vary by viewer)
 */
export function useTheme(surface: Surface = 'theme'): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  const { mode, resolved } = ctx;
  return useMemo(
    () => buildTheme(mode, resolved, surface === 'theme' ? resolved : surface),
    [mode, resolved, surface]
  );
}

export function useCinema(): Theme {
  return useTheme('cinema');
}

/** Read/write the stored preference — for the Settings picker. */
export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used inside <ThemeProvider>');
  return ctx;
}
