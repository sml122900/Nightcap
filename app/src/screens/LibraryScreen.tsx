import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../constants/tokens';
import { getLibrary, getTrashCount } from '../db/queries';
import { LibraryTile } from '../components/library/LibraryTile';
import { Capture } from '../types/capture';

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
}

export function LibraryScreen({ onBack, onOpenTrash }: LibraryScreenProps) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [items, setItems] = useState<(Capture & { stars: number })[]>([]);
  const [trashCount, setTrashCount] = useState(0);

  const reload = useCallback(async () => {
    const minStars = FILTERS.find((f) => f.key === filter)?.minStars;
    const [library, count] = await Promise.all([getLibrary(db, minStars), getTrashCount(db)]);
    setItems(library);
    setTrashCount(count);
  }, [db, filter]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.top}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.ghostBtn}>닫기</Text>
        </Pressable>
        <Text style={styles.title}>보관함</Text>
        <View style={{ width: 34 }} />
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
          renderItem={({ item }) => <LibraryTile item={item} />}
        />
      )}

      <Pressable
        onPress={onOpenTrash}
        style={[styles.trashEntry, { bottom: insets.bottom + TRASH_ENTRY_BOTTOM_GAP }]}
        accessibilityRole="button"
        accessibilityLabel={`휴지통 ${trashCount}개`}
      >
        <Text style={styles.trashEntryText}>휴지통 {trashCount}</Text>
      </Pressable>
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
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: tokens.text,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
  },
  chipOn: {
    backgroundColor: tokens.text,
    borderColor: tokens.text,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: tokens.text2,
    letterSpacing: -0.1,
  },
  chipTextOn: {
    color: '#0b0b0d',
  },
  grid: {
    paddingHorizontal: 24,
    gap: 12,
  },
  row: {
    gap: 12,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: tokens.text3,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  trashEntry: {
    position: 'absolute',
    left: 24,
    right: 24,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: tokens.surface2,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    alignItems: 'center',
  },
  trashEntryText: {
    color: tokens.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
