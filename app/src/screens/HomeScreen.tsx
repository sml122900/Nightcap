import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { tokens } from '../constants/tokens';
import { getTodayStackCount } from '../db/queries';

const TOAST_DURATION = 1800;

interface HomeScreenProps {
  onStartTriage: () => void;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  /** bumped whenever a share-sheet capture lands while the app is open — triggers a toast + recount */
  shareToastNonce: number;
}

/**
 * Landing screen, separate from the swipe deck (TriageScreen) — a shared capture should land
 * here with a toast, not drop the user straight into triage (docs/decisions/share-intent-primary-ingestion.md).
 */
export function HomeScreen({ onStartTriage, onOpenLibrary, onOpenSettings, shareToastNonce }: HomeScreenProps) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevNonceRef = useRef(shareToastNonce);

  const reload = async () => {
    setCount(await getTodayStackCount(db));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  useEffect(() => {
    if (shareToastNonce === prevNonceRef.current) return;
    prevNonceRef.current = shareToastNonce;
    reload();
    setToastMsg('스택에 담았어요');
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), TOAST_DURATION);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareToastNonce]);

  const hasStack = (count ?? 0) > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.top}>
        <View style={{ width: 34 }} />
        <Text style={styles.brand}>nightcap</Text>
        <Pressable onPress={onOpenSettings} hitSlop={8} accessibilityRole="button" accessibilityLabel="설정">
          <Text style={styles.ghostBtn}>설정</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {hasStack ? (
          <>
            <Text style={styles.countLabel}>오늘 담은 캡처</Text>
            <Text style={styles.countValue}>{count}</Text>
            <Pressable onPress={onStartTriage} style={styles.primaryBtn} accessibilityRole="button">
              <Text style={styles.primaryText}>정리 시작</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.emptyText}>아직 담은 게 없어요.{'\n'}콘텐츠를 보다가 공유하기로 넘겨보세요.</Text>
        )}
      </View>

      <Pressable
        onPress={onOpenLibrary}
        style={[styles.libraryEntry, { marginBottom: insets.bottom + 24 }]}
        accessibilityRole="button"
      >
        <Text style={styles.libraryEntryText}>보관함</Text>
      </Pressable>

      {toastMsg ? (
        <View style={[styles.toastWrap, { bottom: insets.bottom + 24 }]} pointerEvents="none">
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(200)} style={styles.toast}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </Animated.View>
        </View>
      ) : null}
    </SafeAreaView>
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
  brand: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: tokens.text2,
  },
  ghostBtn: {
    color: tokens.text2,
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  countLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.text2,
  },
  countValue: {
    marginTop: 10,
    fontSize: 56,
    fontWeight: '800',
    color: tokens.text,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  primaryBtn: {
    marginTop: 28,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: tokens.brand,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0b0b0d',
    letterSpacing: -0.2,
  },
  emptyText: {
    color: tokens.text3,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  libraryEntry: {
    marginHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: tokens.surface2,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    alignItems: 'center',
  },
  libraryEntryText: {
    color: tokens.text,
    fontSize: 14,
    fontWeight: '700',
  },
  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: tokens.surface3,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  toastText: {
    color: tokens.text,
    fontSize: 13.5,
    fontWeight: '700',
  },
});
