import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { tokens } from '../constants/tokens';
import { requestMediaAccess } from '../services/screenshotScan';
import { setAutoScanEnabled, setOnboardingCompleted } from '../services/settings';

const PAGE_COUNT = 3;

interface OnboardingScreenProps {
  /** first run only (settings.ts onboarding_completed_at flag) — App.tsx routes here before home */
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [autoScan, setAutoScan] = useState(false);

  const handleAutoScanToggle = async (value: boolean) => {
    setAutoScan(value);
    if (value) await requestMediaAccess();
    await setAutoScanEnabled(db, value);
  };

  const handleFinish = async () => {
    await setOnboardingCompleted(db);
    onComplete();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
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
                trackColor={{ false: tokens.surface3, true: tokens.brand }}
              />
            </View>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.bg,
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
    backgroundColor: tokens.surface3,
  },
  dotActive: {
    width: 18,
    backgroundColor: tokens.brand,
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
    color: tokens.text,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14.5,
    lineHeight: 21,
    color: tokens.text2,
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
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.45,
  },
  chatMockText: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.text3,
  },
  arrow: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.text3,
  },
  cardMock: {
    width: 88,
    height: 64,
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.surface2,
    borderWidth: 1.5,
    borderColor: tokens.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMockText: {
    fontSize: 13,
    fontWeight: '800',
    color: tokens.brand,
  },
  shareSheetMock: {
    width: '100%',
    marginTop: 8,
    borderRadius: tokens.radius,
    backgroundColor: tokens.surface2,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 14,
  },
  shareSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.surface3,
  },
  shareSheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.text2,
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
    backgroundColor: tokens.surface3,
  },
  shareIconBrand: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.brandDim,
    borderWidth: 1.5,
    borderColor: tokens.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIconBrandText: {
    fontSize: 15,
    fontWeight: '800',
    color: tokens.brand,
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
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.brand,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0b0b0d',
    letterSpacing: -0.2,
  },
});
