import React, { useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '../theme/makeStyles';
import { SystemBars } from '../theme/SystemBars';
import { useTheme, useThemeMode } from '../theme/ThemeProvider';
import type { ThemeMode } from '../theme/tokens';
import { getMetricsSummary, MetricsSummary } from '../services/metrics';
import { setAutoScanRequested, syncAutoScanWithPermission } from '../services/screenshotScan';

/** Taps on the version label needed to reveal the dogfooding numbers in a release build. */
const REVEAL_TAPS = 5;

const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'dark', label: '어둡게' },
  { key: 'light', label: '밝게' },
  { key: 'system', label: '시스템' },
];

interface SettingsScreenProps {
  onBack: () => void;
}

function pct(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(0)}%`;
}

function duration(ms: number | null): string {
  if (ms === null) return '—';
  const totalSec = Math.round(ms / 1000);
  return totalSec < 60 ? `${totalSec}초` : `${Math.floor(totalSec / 60)}분 ${totalSec % 60}초`;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const styles = useStyles();
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [autoScan, setAutoScan] = useState(false);
  // Dogfooding happens on a release build, so `__DEV__` alone would hide these numbers exactly
  // when they're being collected — the version label doubles as a hidden reveal (W3-3 A-3).
  const [revealed, setRevealed] = useState(__DEV__);
  const [taps, setTaps] = useState(0);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);

  // On entry, and again whenever the app comes back to the foreground — the user may have just
  // revoked access in the system settings, and the toggle must not keep claiming otherwise.
  useEffect(() => {
    const resync = () => {
      syncAutoScanWithPermission(db)
        .then(setAutoScan)
        .catch((err) => console.warn('[settings] auto-scan sync failed', err));
    };
    resync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') resync();
    });
    return () => sub.remove();
  }, [db]);

  useEffect(() => {
    if (!revealed) return;
    getMetricsSummary(db)
      .then(setMetrics)
      .catch((err) => console.warn('[settings] metrics load failed', err));
  }, [revealed, db]);

  const handleToggle = async (value: boolean) => {
    // Optimistic, then corrected by what was actually granted — turning it on can be denied.
    setAutoScan(value);
    setAutoScan(await setAutoScanRequested(db, value));
  };

  const handleVersionTap = () => {
    const next = taps + 1;
    setTaps(next);
    if (next >= REVEAL_TAPS) setRevealed(true);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SystemBars />
      <View style={styles.top}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.ghostBtn}>닫기</Text>
        </Pressable>
        <Text style={styles.title}>설정</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>스크린샷 자동 수집</Text>
            <Text style={styles.rowDesc}>켜면 앨범의 새 스크린샷을 자동으로 스택에 담아요. 꺼두면 공유하기로 보낸 것만 담겨요.</Text>
          </View>
          <Switch
            value={autoScan}
            onValueChange={handleToggle}
            trackColor={{ false: theme.c.border, true: theme.c.accent }}
          />
        </View>

        <View style={styles.themeRow}>
          <Text style={styles.rowLabel}>화면 테마</Text>
          <View style={styles.segment}>
            {THEME_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setMode(option.key)}
                style={[styles.segmentItem, mode === option.key && styles.segmentItemOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: mode === option.key }}
                accessibilityLabel={option.label}
              >
                <Text style={[styles.segmentText, mode === option.key && styles.segmentTextOn]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable onPress={handleVersionTap} style={styles.version} accessibilityRole="button">
          <Text style={styles.versionText}>nightcap 1.0.0</Text>
        </Pressable>

        {revealed ? (
          <View style={styles.devSection}>
            <Text style={styles.devTitle}>개발자 · 최근 {metrics?.windowDays ?? 14}일</Text>
            {metrics === null ? (
              <Text style={styles.devEmpty}>불러오는 중…</Text>
            ) : (
              <>
                <Stat label="정리 세션" value={`${metrics.sessions}회 · 일평균 ${metrics.sessionsPerDay.toFixed(1)}`} />
                <Stat label="끝까지 완료" value={`${metrics.completedSessions}회`} />
                <Stat label="보류 비율" value={pct(metrics.deferRatio)} />
                <Stat label="세션 소요(중앙값)" value={duration(metrics.medianDurationMs)} />
                <Stat label="담은 캡처" value={`${metrics.captures}개`} />
                <Stat label="링크 포함 비율" value={pct(metrics.linkRatio)} />
                <Stat
                  label="클립보드 병합(누적)"
                  value={`${metrics.clipboardMerges} / ${metrics.clipboardAttempts}회 시도`}
                />
                <Stat
                  label="유입 경로"
                  value={
                    metrics.intake.length === 0
                      ? '—'
                      : metrics.intake.map((b) => `${b.source} ${b.count}`).join(' · ')
                  }
                />
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.c.bg,
  },
  top: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ghostBtn: {
    color: t.c.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: t.c.textPrimary,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.c.border,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: t.c.textPrimary,
    letterSpacing: -0.2,
  },
  rowDesc: {
    marginTop: 4,
    fontSize: 12.5,
    color: t.c.textTertiary,
    lineHeight: 18,
  },
  themeRow: {
    paddingVertical: t.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.c.border,
    gap: t.space.md,
  },
  segment: {
    flexDirection: 'row',
    gap: t.space.sm,
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.chip,
    borderWidth: 1,
    borderColor: t.c.border,
    backgroundColor: t.c.surface,
  },
  segmentItemOn: {
    backgroundColor: t.c.accentMuted,
    borderColor: t.c.accent,
  },
  segmentText: {
    ...t.type.meta,
    fontWeight: '700',
    color: t.c.textSecondary,
  },
  segmentTextOn: {
    color: t.c.accent,
  },
  version: {
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: 10,
  },
  versionText: {
    fontSize: 12,
    color: t.c.textTertiary,
  },
  devSection: {
    marginTop: 12,
    padding: 16,
    borderRadius: t.radius.card,
    backgroundColor: t.c.surface,
    borderWidth: 1,
    borderColor: t.c.border,
  },
  devTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: t.c.textTertiary,
  },
  devEmpty: {
    marginTop: 12,
    fontSize: 13,
    color: t.c.textTertiary,
  },
  statRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  statLabel: {
    fontSize: 13,
    color: t.c.textSecondary,
  },
  statValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: t.c.textPrimary,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
}));
