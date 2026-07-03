import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../constants/tokens';
import { Capture } from '../../types/capture';

interface LibraryTileProps {
  item: Capture & { stars: number };
}

/**
 * Grid tile — fixed 2-column layout, not a true Pinterest masonry (PROJECT.md §4).
 * Content is skeleton placeholders only (no real capture pipeline yet), so there's
 * no real aspect ratio to justify variable-height balancing logic.
 */
export function LibraryTile({ item }: LibraryTileProps) {
  return (
    <View style={styles.tile}>
      <View style={styles.thumb}>
        {item.kind === 'drm' ? (
          <Text style={styles.drmLabel} numberOfLines={1}>
            {item.title.slice(0, 10)}…
          </Text>
        ) : item.kind === 'video' ? (
          <>
            <View style={styles.avatar} />
            <View style={[styles.skLine, styles.w80]} />
          </>
        ) : (
          <>
            <View style={[styles.skLine, styles.w80]} />
            <View style={styles.skLine} />
            <View style={[styles.skLine, styles.w60]} />
          </>
        )}
        <View style={styles.starBadge}>
          <Text style={styles.starBadgeText}>★{item.stars.toFixed(1)}</Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.app} numberOfLines={1}>
          {item.app}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.border,
    overflow: 'hidden',
  },
  thumb: {
    height: 140,
    backgroundColor: tokens.surface2,
    padding: 10,
    justifyContent: 'flex-end',
  },
  drmLabel: {
    margin: 'auto',
    fontSize: 13,
    fontWeight: '800',
    color: tokens.text,
    textAlign: 'center',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: tokens.surface3,
    marginBottom: 8,
  },
  skLine: {
    height: 7,
    borderRadius: 4,
    backgroundColor: tokens.surface3,
    marginTop: 6,
  },
  w80: { width: '80%', marginTop: 0 },
  w60: { width: '60%' },
  starBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  starBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: tokens.brand,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    padding: 10,
  },
  title: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 17,
    color: tokens.text,
  },
  app: {
    marginTop: 4,
    fontSize: 10.5,
    fontWeight: '600',
    color: tokens.text3,
  },
});
