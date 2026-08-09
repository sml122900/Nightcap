import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { makeStyles } from '../../theme/makeStyles';

interface AccessibleControlsProps {
  onHold: () => void;
  onDrop: () => void;
  onRate: () => void;
  onPrev: () => void;
  disabled?: boolean;
}

/** Swipe alternative for VoiceOver/TalkBack (PROJECT.md §6). Doubles as the on-screen gesture hint. */
export function AccessibleControls({ onHold, onDrop, onRate, onPrev, disabled }: AccessibleControlsProps) {
  const styles = useStyles('cinema');
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

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    gap: t.space.lg,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    // Badge + label are only 22pt tall; these are real controls for TalkBack users (핸드오프 §5-6).
    minHeight: 44,
  },
  pressed: {
    opacity: 0.6,
  },
  keyBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: t.c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 12,
    color: t.c.textSecondary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: t.c.textTertiary,
    letterSpacing: -0.1,
  },
}));
