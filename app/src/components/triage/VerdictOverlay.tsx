import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { makeStyles } from '../../theme/makeStyles';
import { useCinema } from '../../theme/ThemeProvider';
import type { Colors } from '../../theme/tokens';

type AnimatedViewStyle = React.ComponentProps<typeof Animated.View>['style'];

/** live-drag preview labels — 'prev' never resolves to a committed verdict, it's a right-drag hint only */
export type OverlayKind = 'hold' | 'prev' | 'drop' | 'rate';

const LABEL: Record<OverlayKind, string> = {
  hold: '보류',
  prev: '이전',
  drop: '삭제',
  rate: '별점',
};

/** 보류=defer / 삭제=danger / 별점=accent (핸드오프 §4). 'prev' stays neutral — it isn't a verdict. */
const accentFor = (c: Colors): Record<OverlayKind, string> => ({
  hold: c.defer,
  prev: c.textSecondary,
  drop: c.danger,
  rate: c.accent,
});

const bgFor = (c: Colors): Record<OverlayKind, string> => ({
  hold: c.deferScrim,
  prev: c.control,
  drop: c.dangerScrim,
  rate: c.accentScrim,
});

const ROTATE: Record<OverlayKind, string> = {
  hold: '-6deg',
  prev: '6deg',
  drop: '0deg',
  rate: '0deg',
};

interface VerdictOverlayProps {
  type: OverlayKind;
  /** animated {opacity} style — pass a static {opacity:1} for the exit-flight ghost */
  style?: AnimatedViewStyle;
}

export function VerdictOverlay({ type, style }: VerdictOverlayProps) {
  const styles = useStyles('cinema');
  const c = useCinema().c;
  const accent = accentFor(c)[type];
  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, { backgroundColor: bgFor(c)[type] }, style]}>
      <Animated.View style={[styles.labelBox, { borderColor: accent, transform: [{ rotate: ROTATE[type] }] }]}>
        <Text style={[styles.labelText, { color: accent }]}>{LABEL[type]}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.sheet,
  },
  labelBox: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: t.space.md,
  },
  labelText: {
    ...t.type.title,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
}));
