import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../constants/tokens';
import { getTrash, restoreFromTrash } from '../db/queries';
import { TrashTile } from '../components/trash/TrashTile';
import { Capture } from '../types/capture';

interface TrashScreenProps {
  onBack: () => void;
}

export function TrashScreen({ onBack }: TrashScreenProps) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<(Capture & { deletedAt: number })[]>([]);

  const reload = useCallback(async () => {
    setItems(await getTrash(db));
  }, [db]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleRestore = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await restoreFromTrash(db, id);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.top}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.ghostBtn}>닫기</Text>
        </Pressable>
        <Text style={styles.title}>휴지통</Text>
        <View style={{ width: 34 }} />
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>휴지통이 비어있어요.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item }) => <TrashTile item={item} onRestore={handleRestore} />}
        />
      )}
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
  },
  emptyText: {
    color: tokens.text3,
    fontSize: 14,
    fontWeight: '600',
  },
});
