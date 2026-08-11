import React, { useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { makeStyles } from '../theme/makeStyles';
import { SystemBars } from '../theme/SystemBars';
import { HeaderButton, HeaderSpacer } from '../components/common/HeaderButton';
import { DetailPage } from '../components/library/DetailPage';
import { Capture } from '../types/capture';

interface LibraryDetailScreenProps {
  /** Same order as the library grid's current filter/sort (지시서 B) — paging follows that list. */
  items: (Capture & { stars: number })[];
  initialIndex: number;
  onBack: () => void;
}

/**
 * 보관함 상세 — 좌우 스와이프로 인접 카드 탐색(지시서 B). A horizontal paging FlatList rather
 * than a custom pan gesture: the vertical ScrollView inside each page (DetailPage) and this
 * horizontal FlatList scroll in orthogonal directions, which React Native's gesture responder
 * system already arbitrates between without any activeOffsetX/failOffsetY wiring — the "세로
 * 제스처와 충돌" risk the 지시서 flags for a manual-gesture approach doesn't arise here.
 * `windowSize`/`initialNumToRender` keep the neighboring pages mounted so a swipe never lands on
 * a blank frame. No new native module (PagerView) — FlatList paging is core React Native.
 */
export function LibraryDetailScreen({ items: initialItems, initialIndex, onBack }: LibraryDetailScreenProps) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const [items, setItems] = useState(initialItems);
  const [index, setIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<Capture & { stars: number }>>(null);

  const handleDeleted = (removedId: string) => {
    const removedIdx = items.findIndex((it) => it.id === removedId);
    if (removedIdx === -1) return;
    const next = items.filter((it) => it.id !== removedId);
    if (next.length === 0) {
      onBack();
      return;
    }
    const newIndex = Math.min(removedIdx, next.length - 1);
    setItems(next);
    setIndex(newIndex);
    // Removing the last page leaves the scroll offset past the new end — snap back explicitly.
    // Any other removal keeps the same pixel offset, which already lands on the right neighbor.
    if (removedIdx === items.length - 1) {
      requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: newIndex, animated: false }));
    }
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SystemBars />
      <View style={styles.top}>
        <HeaderButton label="닫기" onPress={onBack} />
        <Text style={styles.headerTitle}>상세</Text>
        <HeaderSpacer />
      </View>

      <FlatList
        ref={listRef}
        style={styles.pager}
        data={items}
        keyExtractor={(it) => it.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        windowSize={3}
        // 3, not 1: the initial mount must already include the immediate neighbors, or a swipe
        // right after opening detail lands on a blank page before the viewability pass catches up.
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews={false}
        renderItem={({ item }) => (
          <DetailPage item={item} width={width} onDeleted={() => handleDeleted(item.id)} />
        )}
      />
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
  headerTitle: {
    ...t.type.heading,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: t.c.textPrimary,
  },
  // Without an explicit size, the horizontal FlatList collapses to its content height instead of
  // filling the space below the header — each page's inner ScrollView then has no bounded height
  // to scroll within.
  pager: {
    flex: 1,
  },
}));
