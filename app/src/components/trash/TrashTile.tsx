import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { Capture } from '../../types/capture';
import { CoverImage } from '../common/CoverImage';

const DAY_MS = 24 * 60 * 60 * 1000;
const TRASH_WINDOW_MS = 7 * DAY_MS;

interface TrashTileProps {
  item: Capture & { deletedAt: number };
  onRestore: (id: string) => void;
}

export function TrashTile({ item, onRestore }: TrashTileProps) {
  const styles = useStyles();
  const theme = useTheme();
  const daysLeft = Math.max(0, Math.ceil((item.deletedAt + TRASH_WINDOW_MS - Date.now()) / DAY_MS));

  return (
    <View style={styles.tile}>
      <View style={styles.thumb}>
        {item.kind !== 'drm' && item.imageUri ? (
          <CoverImage uri={item.imageUri} style={StyleSheet.absoluteFill} backgroundColor={theme.c.surfaceRaised} />
        ) : null}
        {item.kind === 'drm' ? (
          <Text style={styles.drmLabel} numberOfLines={1}>
            {item.title.slice(0, 10)}…
          </Text>
        ) : item.imageUri ? null : (
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
    height: 120,
    backgroundColor: t.c.surfaceRaised,
    padding: t.space.sm + 2,
    justifyContent: 'flex-end',
  },
  drmLabel: {
    margin: 'auto',
    fontSize: 12,
    fontWeight: '800',
    color: t.c.textPrimary,
    textAlign: 'center',
  },
  skLine: {
    height: 7,
    borderRadius: 4,
    backgroundColor: t.c.border,
    marginTop: 6,
  },
  w80: { width: '80%', marginTop: 0 },
  w60: { width: '60%' },
  meta: {
    padding: t.space.sm + 2,
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 16,
    color: t.c.textPrimary,
  },
  // `danger` marks the countdown only — the tile itself stays neutral (핸드오프 §4).
  countdown: {
    ...t.type.caption,
    color: t.c.danger,
  },
  restoreBtn: {
    marginTop: 2,
    // 44pt minimum touch target (핸드오프 §5-6) — was 7pt padding on an 11pt line.
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.c.border,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: t.c.textSecondary,
  },
}));
