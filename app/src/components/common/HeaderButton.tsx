import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { makeStyles } from '../../theme/makeStyles';
import type { Surface } from '../../theme/tokens';

/** Minimum touch target (핸드오프 §5-6). Also the width the opposite-side spacer must reserve. */
export const HEADER_BUTTON_SIZE = 44;

interface HeaderButtonProps {
  label: string;
  onPress: () => void;
  /** Defaults to `label`; pass when the visible text is shorter than the action it performs. */
  accessibilityLabel?: string;
  /** Which header edge this sits on — decides which way the 44pt box grows. */
  side?: 'left' | 'right';
  /** Triage and the rate modal are cinema surfaces; everything else follows the theme. */
  surface?: Surface;
}

/**
 * The text-only header actions (닫기 / 설정 / 공유). They measured 24.4×19.8dp — below the 44pt
 * minimum even with `hitSlop`, which was the previous stopgap.
 *
 * `hitSlop` is deliberately not used here: it grows the touch area without growing the view, so the
 * real target stays invisible to layout *and* to `uiautomator`, and it can't be verified. This
 * gives the Pressable a real 44×44 box instead.
 *
 * The box is pulled back with a negative vertical margin so it occupies its old height in the
 * header row while still *rendering* 44pt tall — the header keeps its height across all seven
 * screens and only the touch target changes. Text stays flush against the header's own horizontal
 * padding (`flex-start` on the left edge, `flex-end` on the right), so the 44pt box grows inward
 * into empty header space and never gets clipped at the screen edge.
 */
export function HeaderButton({ label, onPress, accessibilityLabel, side = 'left', surface }: HeaderButtonProps) {
  const styles = useStyles(surface);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.button, side === 'right' ? styles.alignRight : styles.alignLeft]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

/** Balances the title when only one side has a button. */
export function HeaderSpacer() {
  return <View style={{ width: HEADER_BUTTON_SIZE }} />;
}

const useStyles = makeStyles((t) => ({
  button: {
    minWidth: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    // Renders 44 tall, occupies 22 — keeps every header's height exactly as it was.
    marginVertical: -(HEADER_BUTTON_SIZE - 22) / 2,
    justifyContent: 'center',
  },
  alignLeft: {
    alignItems: 'flex-start',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  label: {
    color: t.c.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
}));
