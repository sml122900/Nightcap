import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { Capture } from '../../types/capture';
import { CoverImage } from '../common/CoverImage';
import { StarRating } from '../common/StarRating';

interface LibraryTileProps {
  item: Capture & { stars: number };
  onPress?: () => void;
}

/**
 * Grid tile — fixed 2-column layout, not a true Pinterest masonry (PROJECT.md §4).
 * Mock-seeded content has no real image so it falls back to skeleton placeholders.
 */
export function LibraryTile({ item, onPress }: LibraryTileProps) {
  const styles = useStyles();
  const badge = useBadgeStyles('cinema');
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <View style={styles.thumb}>
        {item.kind !== 'drm' && item.imageUri ? (
          <CoverImage uri={item.imageUri} style={StyleSheet.absoluteFill} backgroundColor={theme.c.surfaceRaised} />
        ) : null}
        {item.kind === 'drm' ? (
          <Text style={styles.drmLabel} numberOfLines={1}>
            {item.title.slice(0, 10)}…
          </Text>
        ) : item.imageUri ? null : item.kind === 'video' ? (
          <>
            <View style={styles.avatar} />
            <View style={[styles.skLine, styles.w80]} />
          </>
        ) : (
          <Text style={styles.textKindTitle} numberOfLines={3}>
            {item.title}
          </Text>
        )}
        <View style={badge.starBadge}>
          <StarRating value={item.stars} />
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.app} numberOfLines={1}>
          {item.src ? `${item.app} · ${item.src}` : item.app}
        </Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  tile: {
    flex: 1,
    borderRadius: t.radius.card,
    backgroundColor: t.c.surface,
    borderWidth: 1,
    borderColor: t.c.border,
    overflow: 'hidden',
    ...t.shadow.card,
  },
  thumb: {
    height: 140,
    backgroundColor: t.c.surfaceRaised,
    padding: t.space.sm + 2,
    justifyContent: 'flex-end',
  },
  drmLabel: {
    margin: 'auto',
    fontSize: 13,
    fontWeight: '800',
    color: t.c.textPrimary,
    textAlign: 'center',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: t.c.border,
    marginBottom: t.space.sm,
  },
  skLine: {
    height: 7,
    borderRadius: 4,
    backgroundColor: t.c.border,
    marginTop: 6,
  },
  w80: { width: '80%', marginTop: 0 },
  textKindTitle: {
    margin: 'auto',
    fontSize: 13,
    fontWeight: '800',
    color: t.c.textPrimary,
    textAlign: 'center',
  },
  meta: {
    padding: t.space.sm + 2,
  },
  title: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 17,
    color: t.c.textPrimary,
  },
  app: {
    marginTop: t.space.xs,
    ...t.type.caption,
    color: t.c.textTertiary,
  },
}));

/**
 * The badge sits ON the cover image, not on a theme surface — so it paints with the cinema palette
 * in both themes. Light mode's darker gold would disappear against the scrim.
 */
const useBadgeStyles = makeStyles((t) => ({
  starBadge: {
    position: 'absolute',
    top: t.space.sm,
    right: t.space.sm,
    backgroundColor: t.c.imageScrim,
    borderRadius: t.radius.chip,
    paddingHorizontal: t.space.sm,
    paddingVertical: t.space.xs,
  },
}));
