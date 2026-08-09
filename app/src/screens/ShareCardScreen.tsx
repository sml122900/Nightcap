import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../constants/tokens';
import { getShareCardData, ShareCardData } from '../db/queries';
import { CoverImage } from '../components/common/CoverImage';

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
      <View style={styles.top}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.ghostBtn}>닫기</Text>
        </Pressable>
        <Text style={styles.headerTitle}>공유 카드</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View ref={cardRef} collapsable={false} style={styles.card}>
          <Text style={styles.eyebrow}>NIGHTCAP</Text>
          <Text style={styles.headline}>알고리즘이 고른 게 아니라{'\n'}내가 고른 것들</Text>

          <View style={styles.grid}>
            {(data?.items ?? []).map((item) => (
              <View key={item.id} style={styles.cell}>
                {item.imageUri ? (
                  <CoverImage uri={item.imageUri} style={StyleSheet.absoluteFill} />
                ) : (
                  <Text style={styles.cellTitle} numberOfLines={3}>
                    {item.title || item.app}
                  </Text>
                )}
                <View style={styles.starBadge}>
                  <Text style={styles.starBadgeText}>★ {item.stars.toFixed(1)}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerPeriod}>{periodLabel(data?.from ?? null, data?.to ?? null)}</Text>
            <Text style={styles.footerStats}>
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
            <ActivityIndicator size="small" color="#0b0b0d" />
          ) : (
            <Text style={styles.primaryText}>이미지로 공유</Text>
          )}
        </Pressable>
      </View>
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
  ghostBtn: {
    color: tokens.text2,
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: tokens.text,
  },
  body: {
    padding: 20,
  },
  card: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius,
    borderWidth: 1,
    borderColor: tokens.border,
    padding: 22,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: tokens.brand,
  },
  headline: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 30,
    color: tokens.text,
  },
  grid: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    // 3열 + gap 8을 함께 쓰므로 100/3이 아니라 여백을 뺀 폭이어야 줄바꿈이 안 깨진다.
    width: `${100 / GRID_COLUMNS - 2.5}%`,
    aspectRatio: 0.72,
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.surface2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  cellTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: tokens.text2,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  starBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: tokens.brand,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  footerPeriod: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.text2,
    fontVariant: ['tabular-nums'],
  },
  footerStats: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.text,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  primaryBtn: {
    paddingVertical: 17,
    borderRadius: 16,
    backgroundColor: tokens.brand,
    alignItems: 'center',
  },
  primaryBtnDim: {
    opacity: 0.5,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0b0b0d',
    letterSpacing: -0.2,
  },
});
