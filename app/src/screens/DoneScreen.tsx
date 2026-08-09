import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '../theme/makeStyles';
import { SystemBars } from '../theme/SystemBars';
import { TriageSession } from '../types/capture';

interface DoneScreenProps {
  session: TriageSession;
  topApp: string | null;
  onOpenLibrary: () => void;
  onRestart: () => void;
  /** 별점 4장 미만이면 카드가 성립하지 않아 아예 넘어오지 않는다(undefined ⇒ 버튼 숨김, W3-3 D) */
  onOpenShareCard?: () => void;
}

/** Wrapped-style takeover (PROJECT.md §4) — replaces the whole triage screen body when the stack empties. */
export function DoneScreen({ session, topApp, onOpenLibrary, onRestart, onOpenShareCard }: DoneScreenProps) {
  const styles = useStyles();
  const avg = session.rated ? session.sum / session.rated : 0;
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SystemBars />
      <View style={styles.body}>
        <Text style={styles.eyebrow}>오늘의 정리</Text>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>평균 별점</Text>
          <Text style={styles.heroValue}>{session.rated ? avg.toFixed(1) : '—'}</Text>
        </View>

        <View style={styles.rows}>
          <Row label="평가한 캡처" value={String(session.rated)} />
          <Row label="삭제 · 사진첩에서 제거" value={String(session.drop)} dim />
          <Row label="최다 출처" value={topApp ?? '—'} />
        </View>

        <Text style={styles.note}>삭제한 {session.drop}장은 휴지통에 7일 보관 후 완전히 지워져요.</Text>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 20 }]}>
        {onOpenShareCard ? (
          <Pressable onPress={onOpenShareCard} style={styles.shareBtn} accessibilityRole="button">
            <Text style={styles.shareText}>공유 카드 만들기</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onOpenLibrary} style={styles.primaryBtn} accessibilityRole="button">
          <Text style={styles.primaryText}>보관함 보기</Text>
        </Pressable>
        <Pressable onPress={onRestart} style={styles.secondaryBtn} accessibilityRole="button">
          <Text style={styles.secondaryText}>다시 시작</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, dim && styles.rowValueDim]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.c.bg,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  eyebrow: {
    ...t.type.meta,
    fontWeight: '800',
    color: t.c.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  hero: {
    marginTop: t.space.xxl,
    backgroundColor: t.c.accent,
    borderRadius: 18,
    paddingHorizontal: t.space.xl - 4,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: t.c.onAccent,
    letterSpacing: -0.3,
  },
  heroValue: {
    fontSize: 40,
    fontWeight: '800',
    color: t.c.onAccent,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  rows: {
    marginTop: t.space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: t.c.border,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: t.c.textSecondary,
    letterSpacing: -0.1,
  },
  rowValue: {
    ...t.type.title,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: t.c.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  rowValueDim: {
    color: t.c.textTertiary,
  },
  note: {
    marginTop: 22,
    fontSize: 14,
    color: t.c.textSecondary,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  actions: {
    paddingHorizontal: t.space.xl,
    gap: 10,
  },
  shareBtn: {
    paddingVertical: 17,
    borderRadius: t.radius.sheet - 4,
    backgroundColor: t.c.accent,
    alignItems: 'center',
  },
  shareText: {
    fontSize: 15,
    fontWeight: '800',
    color: t.c.onAccent,
    letterSpacing: -0.2,
  },
  // Inverted button: `textPrimary` as the fill, so its label has to be the page background.
  primaryBtn: {
    paddingVertical: 17,
    borderRadius: t.radius.sheet - 4,
    backgroundColor: t.c.textPrimary,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: t.c.bg,
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    paddingVertical: 15,
    borderRadius: t.radius.sheet - 4,
    backgroundColor: t.c.surface,
    borderWidth: 1,
    borderColor: t.c.border,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: t.c.textPrimary,
  },
}));
