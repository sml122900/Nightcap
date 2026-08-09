import React from 'react';
import { Text } from 'react-native';
import { makeStyles } from '../../theme/makeStyles';
import type { Surface } from '../../theme/tokens';

type StarSize = 'sm' | 'md' | 'lg';

interface StarRatingProps {
  value: number;
  /** `sm` grid badges · `md` share-card cells · `lg` the library detail row */
  size?: StarSize;
  /** Badges sit on cover art, so they paint cinema; the detail row follows the theme. */
  surface?: Surface;
}

/**
 * The one place a committed rating is rendered as text (핸드오프 §5-5). It appeared in four
 * places with four different sizes, spacings and star glyphs before; only the size varies now.
 * Badge chrome (scrim, corner) stays with each caller — the positions genuinely differ.
 */
export function StarRating({ value, size = 'sm', surface = 'cinema' }: StarRatingProps) {
  const styles = useStyles(surface);
  return <Text style={[styles.base, styles[size]]}>★ {value.toFixed(1)}</Text>;
}

const useStyles = makeStyles((t) => ({
  base: {
    fontWeight: '800',
    color: t.c.accent,
    fontVariant: ['tabular-nums'],
  },
  sm: { fontSize: 11 },
  md: { fontSize: 12 },
  lg: { fontSize: 18 },
}));
