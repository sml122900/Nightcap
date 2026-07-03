import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../constants/tokens';
import { Capture } from '../../types/capture';

const DAY_MS = 24 * 60 * 60 * 1000;
const TRASH_WINDOW_MS = 7 * DAY_MS;

interface TrashTileProps {
  item: Capture & { deletedAt: number };
  onRestore: (id: string) => void;
}

export function TrashTile({ item, onRestore }: TrashTileProps) {
  const daysLeft = Math.max(0, Math.ceil((item.deletedAt + TRASH_WINDOW_MS - Date.now()) / DAY_MS));

  return (
    <View style={styles.tile}>
      <View style={styles.thumb}>
        {item.kind === 'drm' ? (
          <Text style={styles.drmLabel} numberOfLines={1}>
            {item.title.slice(0, 10)}…
          </Text>
        ) : (
          <>
            <View style={[styles.skLine, styles.w80]} />
            <View style={[styles.skLine, styles.w60]} />
          </>
        )}
      </View>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.countdown}>{daysLeft}일 뒤 완전 삭제</Text>
        <Pressable
          onPress={() => onRestore(item.id)}
          style={styles.restoreBtn}
          accessibilityRole="button"
          accessibilityLabel={`${item.title} 복원`}
        >
          <Text style={styles.restoreText}>복원</Text>
        </Pressable>
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
    height: 120,
    backgroundColor: tokens.surface2,
    padding: 10,
    justifyContent: 'flex-end',
  },
  drmLabel: {
    margin: 'auto',
    fontSize: 12,
    fontWeight: '800',
    color: tokens.text,
    textAlign: 'center',
  },
  skLine: {
    height: 7,
    borderRadius: 4,
    backgroundColor: tokens.surface3,
    marginTop: 6,
  },
  w80: { width: '80%', marginTop: 0 },
  w60: { width: '60%' },
  meta: {
    padding: 10,
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 16,
    color: tokens.text,
  },
  countdown: {
    fontSize: 10.5,
    fontWeight: '600',
    color: tokens.danger,
  },
  restoreBtn: {
    marginTop: 2,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: tokens.text2,
  },
});
