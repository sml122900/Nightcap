import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../constants/tokens';
import { Capture } from '../../types/capture';
import { CoverImage } from '../common/CoverImage';

interface LibraryTileProps {
  item: Capture & { stars: number };
  onPress?: () => void;
}

/**
 * Grid tile — fixed 2-column layout, not a true Pinterest masonry (PROJECT.md §4).
 * Mock-seeded content has no real image so it falls back to skeleton placeholders.
 */
export function LibraryTile({ item, onPress }: LibraryTileProps) {
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <View style={styles.thumb}>
        {item.kind !== 'drm' && item.imageUri ? (
          <CoverImage uri={item.imageUri} style={StyleSheet.absoluteFill} />
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
        <View style={styles.starBadge}>
          <Text style={styles.starBadgeText}>★{item.stars.toFixed(1)}</Text>
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
  textKindTitle: {
    margin: 'auto',
    fontSize: 13,
    fontWeight: '800',
    color: tokens.text,
    textAlign: 'center',
  },
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
