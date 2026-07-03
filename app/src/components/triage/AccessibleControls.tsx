import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../constants/tokens';

interface AccessibleControlsProps {
  onHold: () => void;
  onDrop: () => void;
  onRate: () => void;
  onPrev: () => void;
  disabled?: boolean;
}

/** Swipe alternative for VoiceOver/TalkBack (PROJECT.md §6). Doubles as the on-screen gesture hint. */
export function AccessibleControls({ onHold, onDrop, onRate, onPrev, disabled }: AccessibleControlsProps) {
  const items: { key: string; label: string; onPress: () => void }[] = [
    { key: '←', label: '보류', onPress: onHold },
    { key: '↓', label: '삭제', onPress: onDrop },
    { key: '↑', label: '별점', onPress: onRate },
    { key: '→', label: '이전', onPress: onPrev },
  ];

  return (
    <View style={styles.row}>
      {items.map(({ key, label, onPress }) => (
        <Pressable
          key={key}
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [styles.hint, pressed && styles.pressed]}
          hitSlop={8}
        >
          <View style={styles.keyBadge}>
            <Text style={styles.keyText}>{key}</Text>
          </View>
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.6,
  },
  keyBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 12,
    color: tokens.text2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.text3,
    letterSpacing: -0.1,
  },
});
