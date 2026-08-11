import React, { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { makeStyles } from '../theme/makeStyles';
import { SystemBars } from '../theme/SystemBars';
import { useTheme } from '../theme/ThemeProvider';
import { bulkApplyDrop, getLibrary, getRatedCount, getTrashCount, SHARE_CARD_MIN_ITEMS } from '../db/queries';
import { HeaderButton, HeaderSpacer } from '../components/common/HeaderButton';
import { LibraryTile } from '../components/library/LibraryTile';
import { LibraryDetailScreen } from './LibraryDetailScreen';
import { Capture } from '../types/capture';
import { fireSelectionModeHaptic } from '../utils/haptics';

type FilterKey = 'all' | '4.5' | '4' | '3';

const TRASH_ENTRY_BOTTOM_GAP = 20;
const TRASH_ENTRY_HEIGHT = 48;

const FILTERS: { key: FilterKey; label: string; minStars?: number }[] = [
  { key: 'all', label: '전체' },
  { key: '4.5', label: '4.5↑', minStars: 4.5 },
  { key: '4', label: '4.0↑', minStars: 4 },
  { key: '3', label: '3.0↑', minStars: 3 },
];

interface LibraryScreenProps {
  onBack: () => void;
  onOpenTrash: () => void;
  onOpenShareCard: () => void;
}

export function LibraryScreen({ onBack, onOpenTrash, onOpenShareCard }: LibraryScreenProps) {
  const styles = useStyles();
  const theme = useTheme();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [items, setItems] = useState<(Capture & { stars: number })[]>([]);
  const [trashCount, setTrashCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ratedCount, setRatedCount] = useState(0);
  // Multi-select (지시서 A). Deliberately not persisted — screen exit clears it — and independent
  // of `items`/`filter` so a selection made before switching filters survives the switch even for
  // rows that scroll out of the now-filtered view (지시서: "화면 밖 선택 포함").
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(async () => {
    const minStars = FILTERS.find((f) => f.key === filter)?.minStars;
    // 별점 필터가 걸려 있어도 공유 카드 진입 조건은 보관함 전체 기준이라 따로 센다.
    const [library, count, rated] = await Promise.all([
      getLibrary(db, minStars),
      getTrashCount(db),
      getRatedCount(db),
    ]);
    setItems(library);
    setTrashCount(count);
    setRatedCount(rated);
  }, [db, filter]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Own back-button handling for the detail/selection sub-states so hardware back unwinds them
  // one at a time — App.tsx's handler only knows about the top-level screen switch, not these.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectionMode) {
        setSelectionMode(false);
        setSelectedIds(new Set());
        return true;
      }
      if (selectedId === null) return false;
      setSelectedId(null);
      return true;
    });
    return () => sub.remove();
  }, [selectionMode, selectedId]);

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  const handleCloseDetail = () => {
    setSelectedId(null);
    reload();
  };

  const handleTileLongPress = (id: string) => {
    if (selectionMode) return;
    fireSelectionModeHaptic();
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const handleTilePress = (id: string) => {
    if (!selectionMode) {
      setSelectedId(id);
      return;
    }
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    if (next.size === 0) setSelectionMode(false);
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    Alert.alert(`${count}개를 휴지통으로 이동`, undefined, [
      { text: '취소', style: 'cancel' },
      {
        text: '이동',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await bulkApplyDrop(db, [...selectedIds]);
          } catch (err) {
            console.warn('[library] bulk delete failed', err);
          } finally {
            setDeleting(false);
            setSelectionMode(false);
            setSelectedIds(new Set());
            reload();
          }
        },
      },
    ]);
  };

  if (selectedItem) {
    return <LibraryDetailScreen item={selectedItem} onBack={handleCloseDetail} />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SystemBars />
      <View style={styles.top}>
        <HeaderButton label="닫기" onPress={onBack} />
        <Text style={styles.title}>보관함</Text>
        {ratedCount >= SHARE_CARD_MIN_ITEMS ? (
          <HeaderButton label="공유" onPress={onOpenShareCard} accessibilityLabel="공유 카드" side="right" />
        ) : (
          <HeaderSpacer />
        )}
      </View>

      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, filter === f.key && styles.chipOn]}
            accessibilityRole="button"
            accessibilityLabel={f.label}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextOn]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 여기엔 아무것도 없어요.{'\n'}오늘의 스택을 정리하면 채워져요.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: insets.bottom + TRASH_ENTRY_BOTTOM_GAP + TRASH_ENTRY_HEIGHT + 16 },
          ]}
          renderItem={({ item }) => (
            <LibraryTile
              item={item}
              onPress={() => handleTilePress(item.id)}
              onLongPress={() => handleTileLongPress(item.id)}
              selected={selectedIds.has(item.id)}
            />
          )}
        />
      )}

      {selectionMode ? (
        <Animated.View
          entering={FadeIn.duration(theme.motion.base)}
          exiting={FadeOut.duration(theme.motion.base)}
          style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}
        >
          <Text style={styles.actionBarCount}>{selectedIds.size}개 선택</Text>
          <Pressable
            onPress={handleBulkDelete}
            disabled={deleting}
            style={[styles.actionBarDeleteBtn, deleting && styles.actionBarDeleteBtnDim]}
            accessibilityRole="button"
            accessibilityLabel="선택 삭제"
          >
            <Text style={styles.actionBarDeleteText}>삭제</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <Pressable
          onPress={onOpenTrash}
          style={[styles.trashEntry, { bottom: insets.bottom + TRASH_ENTRY_BOTTOM_GAP }]}
          accessibilityRole="button"
          accessibilityLabel={`휴지통 ${trashCount}개`}
        >
          <Text style={styles.trashEntryText}>휴지통 {trashCount}</Text>
        </Pressable>
      )}
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
  title: {
    ...t.type.heading,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: t.c.textPrimary,
  },
  chips: {
    flexDirection: 'row',
    gap: t.space.sm,
    paddingHorizontal: t.space.xl,
    paddingVertical: t.space.md,
  },
  chip: {
    paddingHorizontal: 15,
    // 44pt touch target — the chip's own padding only came to ~30 (핸드오프 §5-6).
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: t.radius.full,
    backgroundColor: t.c.surface,
    borderWidth: 1,
    borderColor: t.c.border,
  },
  chipOn: {
    backgroundColor: t.c.textPrimary,
    borderColor: t.c.textPrimary,
  },
  chipText: {
    ...t.type.meta,
    fontWeight: '700',
    color: t.c.textSecondary,
    letterSpacing: -0.1,
  },
  chipTextOn: {
    color: t.c.bg,
  },
  grid: {
    paddingHorizontal: t.space.xl,
    gap: t.space.md,
  },
  row: {
    gap: t.space.md,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.space.xxxl,
  },
  emptyText: {
    ...t.type.body,
    color: t.c.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  trashEntry: {
    position: 'absolute',
    left: t.space.xl,
    right: t.space.xl,
    paddingVertical: 14,
    borderRadius: t.radius.sheet - 4,
    backgroundColor: t.c.surface,
    borderWidth: 1,
    borderColor: t.c.border,
    alignItems: 'center',
    ...t.shadow.card,
  },
  trashEntryText: {
    color: t.c.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: t.space.xl,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.c.surfaceRaised,
    borderTopWidth: 1,
    borderTopColor: t.c.border,
  },
  actionBarCount: {
    fontSize: 14.5,
    fontWeight: '700',
    color: t.c.textPrimary,
  },
  actionBarDeleteBtn: {
    minHeight: 44,
    paddingHorizontal: t.space.xl - 4,
    borderRadius: t.radius.chip,
    backgroundColor: t.c.dangerMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBarDeleteBtnDim: {
    opacity: 0.5,
  },
  actionBarDeleteText: {
    fontSize: 14,
    fontWeight: '800',
    color: t.c.danger,
  },
}));
