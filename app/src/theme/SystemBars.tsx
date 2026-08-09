import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { useTheme } from './ThemeProvider';
import type { Surface } from './tokens';

/**
 * Status bar + Android navigation bar icon colors, declared per screen so a cinema surface keeps
 * light icons even while the app theme is light (핸드오프 §5-1, §5-2). Both libraries merge props
 * by mount order, so the innermost mounted screen wins.
 *
 * Naming differs between the two: expo-status-bar's `style` is the CONTENT color, while
 * expo-navigation-bar's is the BAR color (`'light'` bar ⇒ dark icons) — hence the inversion below.
 * The nav bar only listens when the plugin's `enforceContrast` is false (set in app.json).
 */
export function SystemBars({ surface = 'theme' }: { surface?: Surface }) {
  const light = useTheme(surface).palette === 'light';
  return (
    <>
      <StatusBar style={light ? 'dark' : 'light'} />
      <NavigationBar style={light ? 'light' : 'dark'} />
    </>
  );
}
