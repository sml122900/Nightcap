import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '../theme/makeStyles';
import { SystemBars } from '../theme/SystemBars';
import { useTheme } from '../theme/ThemeProvider';
import { getShareCardData, ShareCardData } from '../db/queries';
import { CoverImage } from '../components/common/CoverImage';
import { StarRating } from '../components/common/StarRating';

const GRID_COLUMNS = 3;

interface ShareCardScreenProps {
  onBack: () => void;
}

function dateLabel(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function periodLabel(from: number | null, to: number | null): string {
  if (from === null || to === null) return '—';
  const start = dateLabel(from);
  const end = dateLabel(to);
  return start === end ? start : `${start} – ${end}`;
}

/**
 * 공유 카드(PROJECT.md §4, W3-3 D) — Letterboxd 문법을 빌린 한 장짜리 요약.
 * "알고리즘이 고른 게 아니라 내가 고른 것들"이라는 정체성을 밖으로 내보내는 유일한 표면이다.
 * 캡처 대상은 `cardRef`가 걸린 뷰뿐 — 버튼/헤더는 프레임 밖이라 이미지에 들어가지 않는다.
 */
export function ShareCardScreen({ onBack }: ShareCardScreenProps) {
  const styles = useStyles();
  const theme = useTheme();
  // The card is the output, not a view of the app: pinned dark so two users sharing the same
  // week don't produce two different-looking images (핸드오프 §4).
  const card = useCardStyles('dark');
  const cardTheme = useTheme('dark');
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const cardRef = useRef<View>(null);
  const [data, setData] = useState<ShareCardData | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    getShareCardData(db)
      .then(setData)
      .catch((err) => console.warn('[shareCard] load failed', err));
  }, [db]);

  const handleShare = async () => {
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'nightcap' });
      }
    } catch (err) {
      console.warn('[shareCard] share failed', err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SystemBars />
      <View style={styles.top}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.ghostBtn}>닫기</Text>
        </Pressable>
        <Text style={styles.headerTitle}>공유 카드</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View ref={cardRef} collapsable={false} style={card.card}>
          <Text style={card.eyebrow}>NIGHTCAP</Text>
          <Text style={card.headline}>알고리즘이 고른 게 아니라{'\n'}내가 고른 것들</Text>

          <View style={card.grid}>
            {(data?.items ?? []).map((item) => (
              <View key={item.id} style={card.cell}>
                {item.imageUri ? (
                  <CoverImage
                    uri={item.imageUri}
                    style={StyleSheet.absoluteFill}
                    backgroundColor={cardTheme.c.surfaceRaised}
                  />
                ) : (
                  <Text style={card.cellTitle} numberOfLines={3}>
                    {item.title || item.app}
                  </Text>
                )}
                <View style={card.starBadge}>
                  <StarRating value={item.stars} size="md" surface="dark" />
                </View>
              </View>
            ))}
          </View>

          <View style={card.footer}>
            <Text style={card.footerPeriod}>{periodLabel(data?.from ?? null, data?.to ?? null)}</Text>
            <Text style={card.footerStats}>
              평균 ★{(data?.avg ?? 0).toFixed(1)} · 총 {data?.total ?? 0}개
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable
          onPress={handleShare}
          disabled={sharing || data === null}
          style={[styles.primaryBtn, (sharing || data === null) && styles.primaryBtnDim]}
          accessibilityRole="button"
        >
          {sharing ? (
            <ActivityIndicator size="small" color={theme.c.onAccent} />
          ) : (
            <Text style={styles.primaryText}>이미지로 공유</Text>
          )}
        </Pressable>
      </View>
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
  ghostBtn: {
    color: t.c.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    ...t.type.heading,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: t.c.textPrimary,
  },
  body: {
    padding: t.space.xl - 4,
  },
  actions: {
    paddingHorizontal: t.space.xl,
    paddingTop: t.space.sm,
  },
  primaryBtn: {
    paddingVertical: 17,
    borderRadius: t.radius.sheet - 4,
    backgroundColor: t.c.accent,
    alignItems: 'center',
  },
  primaryBtnDim: {
    opacity: 0.5,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: t.c.onAccent,
    letterSpacing: -0.2,
  },
}));

/** Everything inside `cardRef` — pinned to the dark palette because it becomes a PNG. */
const useCardStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.c.surface,
    borderRadius: t.radius.sheet,
    borderWidth: 1,
    borderColor: t.c.border,
    padding: 22,
  },
  eyebrow: {
    ...t.type.caption,
    fontWeight: '800',
    letterSpacing: 2,
    color: t.c.accent,
  },
  headline: {
    marginTop: t.space.md,
    ...t.type.title,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 30,
    color: t.c.textPrimary,
  },
  grid: {
    marginTop: t.space.xl - 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.space.sm,
  },
  cell: {
    // 3열 + gap 8을 함께 쓰므로 100/3이 아니라 여백을 뺀 폭이어야 줄바꿈이 안 깨진다.
    width: `${100 / GRID_COLUMNS - 2.5}%`,
    aspectRatio: 0.72,
    borderRadius: t.radius.card,
    backgroundColor: t.c.surfaceRaised,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: t.space.sm,
  },
  cellTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: t.c.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  starBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: t.c.imageScrim,
  },
  footer: {
    marginTop: t.space.xl - 4,
    paddingTop: t.space.lg,
    borderTopWidth: 1,
    borderTopColor: t.c.border,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  footerPeriod: {
    ...t.type.meta,
    fontWeight: '700',
    color: t.c.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  footerStats: {
    ...t.type.meta,
    fontWeight: '700',
    color: t.c.textPrimary,
    fontVariant: ['tabular-nums'],
  },
}));
