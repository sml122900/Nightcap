import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../constants/tokens';
import { getMetricsSummary, MetricsSummary } from '../services/metrics';
import { getAutoScanEnabled, setAutoScanEnabled } from '../services/settings';

/** Taps on the version label needed to reveal the dogfooding numbers in a release build. */
const REVEAL_TAPS = 5;

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
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [autoScan, setAutoScan] = useState(false);
  // Dogfooding happens on a release build, so `__DEV__` alone would hide these numbers exactly
  // when they're being collected — the version label doubles as a hidden reveal (W3-3 A-3).
  const [revealed, setRevealed] = useState(__DEV__);
  const [taps, setTaps] = useState(0);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);

  useEffect(() => {
    getAutoScanEnabled(db).then(setAutoScan);
  }, [db]);

  useEffect(() => {
    if (!revealed) return;
    getMetricsSummary(db)
      .then(setMetrics)
      .catch((err) => console.warn('[settings] metrics load failed', err));
  }, [revealed, db]);

  const handleToggle = async (value: boolean) => {
    setAutoScan(value);
    await setAutoScanEnabled(db, value);
  };

  const handleVersionTap = () => {
    const next = taps + 1;
    setTaps(next);
    if (next >= REVEAL_TAPS) setRevealed(true);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
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
            trackColor={{ false: tokens.surface3, true: tokens.brand }}
          />
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
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.bg,
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
    color: tokens.text2,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: tokens.text,
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
    borderBottomColor: tokens.border,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: tokens.text,
    letterSpacing: -0.2,
  },
  rowDesc: {
    marginTop: 4,
    fontSize: 12.5,
    color: tokens.text3,
    lineHeight: 18,
  },
  version: {
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: 10,
  },
  versionText: {
    fontSize: 12,
    color: tokens.text3,
  },
  devSection: {
    marginTop: 12,
    padding: 16,
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  devTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: tokens.text3,
  },
  devEmpty: {
    marginTop: 12,
    fontSize: 13,
    color: tokens.text3,
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
    color: tokens.text2,
  },
  statValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: tokens.text,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
