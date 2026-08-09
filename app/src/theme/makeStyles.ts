import { StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import type { Surface, Theme } from './tokens';

/**
 * Module-scope `StyleSheet.create` can't see the theme, so styles are declared as a factory and
 * resolved by a hook instead:
 *
 *   const useStyles = makeStyles((t) => ({ screen: { backgroundColor: t.c.bg } }));
 *   const styles = useStyles();            // follows the theme
 *   const styles = useStyles('cinema');    // theme-independent dark surface
 *
 * Results are cached per palette (dark/light/cinema), so a factory runs at most three times for
 * the app's lifetime — the same cost profile as the module-level sheets this replaces. That cache
 * is only sound because the factory's output depends on the theme *only* through the palette;
 * don't branch on `t.mode`/`t.resolved` inside one.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (t: Theme) => T) {
  const cache = new Map<string, T>();
  return function useStyles(surface: Surface = 'theme'): T {
    const theme = useTheme(surface);
    const cached = cache.get(theme.palette);
    if (cached) return cached;
    const created = StyleSheet.create(factory(theme));
    cache.set(theme.palette, created);
    return created;
  };
}
