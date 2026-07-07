import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../constants/tokens';
import { getAutoScanEnabled, setAutoScanEnabled } from '../services/settings';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [autoScan, setAutoScan] = useState(false);

  useEffect(() => {
    getAutoScanEnabled(db).then(setAutoScan);
  }, [db]);

  const handleToggle = async (value: boolean) => {
    setAutoScan(value);
    await setAutoScanEnabled(db, value);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.top}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.ghostBtn}>닫기</Text>
        </Pressable>
        <Text style={styles.title}>설정</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>스크린샷 자동 수집</Text>
            <Text style={styles.rowDesc}>켜면 앨범의 새 스크린샷을 자동으로 스택에 담아요. 꺼두면 공유하기로 보낸 것만 담겨요.</Text>
          </View>
          <Switch
            value={autoScan}
            onValueChange={handleToggle}
            trackColor={{ false: tokens.surface3, true: tokens.brand }}
          />
        </View>
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
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: tokens.text,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
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
});
