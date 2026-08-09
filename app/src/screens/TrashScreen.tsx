import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '../theme/makeStyles';
import { SystemBars } from '../theme/SystemBars';
import { getTrash, restoreFromTrash } from '../db/queries';
import { TrashTile } from '../components/trash/TrashTile';
import { Capture } from '../types/capture';

interface TrashScreenProps {
  onBack: () => void;
}

export function TrashScreen({ onBack }: TrashScreenProps) {
  const styles = useStyles();
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
      <SystemBars />
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
  title: {
    ...t.type.heading,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: t.c.textPrimary,
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
    textAlign: 'center',
  },
}));
