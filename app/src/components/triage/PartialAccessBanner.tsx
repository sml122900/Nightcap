import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../constants/tokens';

interface PartialAccessBannerProps {
  onRequestFullAccess: () => void;
}

/** Android 14+ "일부만 허용" state — nudges the user toward full access (PROJECT.md W3-1 §1). */
export function PartialAccessBanner({ onRequestFullAccess }: PartialAccessBannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.text} numberOfLines={2}>
        일부 사진에만 접근 가능해요 · 스캔 결과가 제한될 수 있어요
      </Text>
      <Pressable
        onPress={onRequestFullAccess}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="사진 접근 전체 허용"
      >
        <Text style={styles.buttonText}>전체 허용</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.surface2,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: tokens.text2,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: tokens.brandDim,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '800',
    color: tokens.brand,
  },
});
