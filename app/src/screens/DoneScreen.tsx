import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../constants/tokens';
import { TriageSession } from '../types/capture';

interface DoneScreenProps {
  session: TriageSession;
  topApp: string | null;
  onOpenLibrary: () => void;
  onRestart: () => void;
}

/** Wrapped-style takeover (PROJECT.md §4) — replaces the whole triage screen body when the stack empties. */
export function DoneScreen({ session, topApp, onOpenLibrary, onRestart }: DoneScreenProps) {
  const avg = session.rated ? session.sum / session.rated : 0;
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
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
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, dim && styles.rowValueDim]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    color: tokens.text3,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  hero: {
    marginTop: 32,
    backgroundColor: tokens.brand,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1200',
    letterSpacing: -0.3,
  },
  heroValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1a1200',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  rows: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.text2,
    letterSpacing: -0.1,
  },
  rowValue: {
    fontSize: 22,
    fontWeight: '800',
    color: tokens.text,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  rowValueDim: {
    color: tokens.text3,
  },
  note: {
    marginTop: 22,
    fontSize: 14,
    color: tokens.text2,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  actions: {
    paddingHorizontal: 24,
    gap: 10,
  },
  primaryBtn: {
    paddingVertical: 17,
    borderRadius: 16,
    backgroundColor: tokens.text,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0b0b0d',
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: tokens.surface2,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.text,
  },
});
