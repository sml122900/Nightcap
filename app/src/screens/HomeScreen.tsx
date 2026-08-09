import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { makeStyles } from '../theme/makeStyles';
import { SystemBars } from '../theme/SystemBars';
import { HeaderButton, HeaderSpacer } from '../components/common/HeaderButton';
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
  const styles = useStyles();
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
      <SystemBars />
      <View style={styles.top}>
        <HeaderSpacer />
        <Text style={styles.brand}>nightcap</Text>
        <HeaderButton label="설정" onPress={onOpenSettings} side="right" />
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

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.c.bg,
  },
  top: {
    paddingHorizontal: t.space.xl,
    paddingTop: t.space.md,
    paddingBottom: t.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: t.c.textSecondary,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.space.xxl,
  },
  countLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: t.c.textSecondary,
  },
  countValue: {
    marginTop: 10,
    fontSize: 56,
    fontWeight: '800',
    color: t.c.textPrimary,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  primaryBtn: {
    marginTop: 28,
    paddingHorizontal: t.space.xxl,
    paddingVertical: t.space.lg,
    borderRadius: t.radius.sheet - 4,
    backgroundColor: t.c.accent,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: t.c.onAccent,
    letterSpacing: -0.2,
  },
  emptyText: {
    ...t.type.body,
    color: t.c.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  libraryEntry: {
    marginHorizontal: t.space.xl,
    paddingVertical: 14,
    borderRadius: t.radius.sheet - 4,
    backgroundColor: t.c.surface,
    borderWidth: 1,
    borderColor: t.c.border,
    alignItems: 'center',
    ...t.shadow.card,
  },
  libraryEntryText: {
    color: t.c.textPrimary,
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
    backgroundColor: t.c.surfaceRaised,
    borderWidth: 1,
    borderColor: t.c.border,
    borderRadius: 14,
    paddingHorizontal: t.space.xl - 4,
    paddingVertical: t.space.md,
    ...t.shadow.modal,
  },
  toastText: {
    color: t.c.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
}));
