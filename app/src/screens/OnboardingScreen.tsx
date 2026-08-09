import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { makeStyles } from '../theme/makeStyles';
import { SystemBars } from '../theme/SystemBars';
import { useTheme } from '../theme/ThemeProvider';
import {
  AutoScanState,
  MediaAccess,
  presentAccessPicker,
  setAutoScanRequested,
  syncAutoScanWithPermission,
} from '../services/screenshotScan';
import { LimitedAccessNotice } from '../components/common/LimitedAccessNotice';
import { setOnboardingCompleted } from '../services/settings';

const PAGE_COUNT = 3;

interface OnboardingScreenProps {
  /** first run only (settings.ts onboarding_completed_at flag) — App.tsx routes here before home */
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const styles = useStyles();
  const theme = useTheme();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [autoScan, setAutoScan] = useState(false);
  const [access, setAccess] = useState<MediaAccess>('none');

  const applyState = (state: AutoScanState) => {
    setAutoScan(state.enabled);
    setAccess(state.access);
  };

  const handleAutoScanToggle = async (value: boolean) => {
    // 거부면 토글이 다시 꺼진다 — 설정 화면과 같은 규칙. 어느 결과든 다음 장으로 넘어갈 수 있고,
    // 스캔은 허용되지 않았을 때 조용히 no-op한다.
    setAutoScan(value);
    applyState(await setAutoScanRequested(db, value));
  };

  /** Android 15에서는 선택기를 취소하면 limited가 된다 — 여기서 곧장 다시 열 수 있어야 한다. */
  const handleRequestFullAccess = async () => {
    await presentAccessPicker();
    applyState(await syncAutoScanWithPermission(db));
  };

  const handleFinish = async () => {
    await setOnboardingCompleted(db);
    onComplete();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SystemBars />
      <View style={styles.dots}>
        {Array.from({ length: PAGE_COUNT }).map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <Animated.View key={page} entering={FadeIn.duration(220)} style={styles.body}>
        {page === 0 ? (
          <>
            <Text style={styles.title}>단톡방에 보내긴 그렇고,{'\n'}나에게 보내면 묻히고.</Text>
            <Text style={styles.desc}>재밌게 본 릴스, 쇼츠, 영상 — 여기에 모으세요.</Text>
            <View style={styles.visualRow}>
              <View style={styles.chatMock}>
                <Text style={styles.chatMockText}>단톡방</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
              <View style={styles.cardMock}>
                <Text style={styles.cardMockText}>nightcap</Text>
              </View>
            </View>
          </>
        ) : null}

        {page === 1 ? (
          <>
            <Text style={styles.title}>재밌는 거 보면{'\n'}공유 버튼 → Nightcap</Text>
            <View style={styles.shareSheetMock}>
              <View style={styles.shareSheetHandle} />
              <Text style={styles.shareSheetLabel}>공유</Text>
              <View style={styles.shareIconRow}>
                <View style={styles.shareIconGhost} />
                <View style={styles.shareIconGhost} />
                <View style={styles.shareIconGhost} />
                <View style={styles.shareIconBrand}>
                  <Text style={styles.shareIconBrandText}>N</Text>
                </View>
              </View>
            </View>
            <Text style={styles.desc}>매일 밤, 스와이프로 별점 정리</Text>
          </>
        ) : null}

        {page === 2 ? (
          <>
            <Text style={styles.title}>스크린샷도{'\n'}자동으로 담고 싶다면</Text>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>스크린샷 자동 수집</Text>
                <Text style={styles.rowDesc}>
                  켜면 앨범의 새 스크린샷을 자동으로 스택에 담아요. 나중에 설정에서 바꿀 수 있어요.
                </Text>
              </View>
              <Switch
                value={autoScan}
                onValueChange={handleAutoScanToggle}
                trackColor={{ false: theme.c.border, true: theme.c.accent }}
              />
            </View>
            {/* Android 15에서는 선택기를 취소해도 limited가 부여된다. 토글은 켜진 채 두고
                (실제로 권한이 있다) 무엇이 안 되는지만 알린다 — 온보딩을 막지는 않는다. */}
            {autoScan && access === 'limited' ? (
              <LimitedAccessNotice onRequestFullAccess={handleRequestFullAccess} style={styles.accessNotice} />
            ) : null}
          </>
        ) : null}
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        {page < PAGE_COUNT - 1 ? (
          <Pressable onPress={() => setPage((p) => p + 1)} style={styles.primaryBtn} accessibilityRole="button">
            <Text style={styles.primaryText}>다음</Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleFinish} style={styles.primaryBtn} accessibilityRole="button">
            <Text style={styles.primaryText}>시작하기</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.c.bg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: t.c.border,
  },
  dotActive: {
    width: 18,
    backgroundColor: t.c.accent,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 32,
    color: t.c.textPrimary,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14.5,
    lineHeight: 21,
    color: t.c.textSecondary,
    textAlign: 'center',
  },
  visualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  chatMock: {
    width: 88,
    height: 64,
    borderRadius: t.radius.card,
    backgroundColor: t.c.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.45,
  },
  chatMockText: {
    fontSize: 12,
    fontWeight: '700',
    color: t.c.textTertiary,
  },
  arrow: {
    fontSize: 18,
    fontWeight: '700',
    color: t.c.textTertiary,
  },
  cardMock: {
    width: 88,
    height: 64,
    borderRadius: t.radius.card,
    backgroundColor: t.c.surfaceRaised,
    borderWidth: 1.5,
    borderColor: t.c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMockText: {
    fontSize: 13,
    fontWeight: '800',
    color: t.c.accent,
  },
  shareSheetMock: {
    width: '100%',
    marginTop: 8,
    borderRadius: t.radius.sheet,
    backgroundColor: t.c.surfaceRaised,
    borderWidth: 1,
    borderColor: t.c.border,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 14,
  },
  shareSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.c.border,
  },
  shareSheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: t.c.textSecondary,
  },
  shareIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  shareIconGhost: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.c.border,
  },
  shareIconBrand: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.c.accentMuted,
    borderWidth: 1.5,
    borderColor: t.c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIconBrandText: {
    fontSize: 15,
    fontWeight: '800',
    color: t.c.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  rowText: {
    flex: 1,
  },
  accessNotice: {
    width: '100%',
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
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: t.radius.card,
    backgroundColor: t.c.accent,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: t.c.onAccent,
    letterSpacing: -0.2,
  },
}));
