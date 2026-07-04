import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { tokens } from '../../constants/tokens';

type AnimatedViewStyle = React.ComponentProps<typeof Animated.View>['style'];

/** live-drag preview labels — 'prev' never resolves to a committed verdict, it's a right-drag hint only */
export type OverlayKind = 'hold' | 'prev' | 'drop' | 'rate';

const LABEL: Record<OverlayKind, string> = {
  hold: '보류',
  prev: '이전',
  drop: '삭제',
  rate: '별점',
};

const ACCENT: Record<OverlayKind, string> = {
  hold: tokens.text2,
  prev: tokens.text2,
  drop: tokens.danger,
  rate: tokens.brand,
};

const BG: Record<OverlayKind, string> = {
  hold: tokens.neutralDim,
  prev: tokens.neutralDim,
  drop: tokens.dangerDim,
  rate: tokens.brandDim,
};

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
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, { backgroundColor: BG[type] }, style]}
    >
      <Animated.View
        style={[
          styles.labelBox,
          { borderColor: ACCENT[type], transform: [{ rotate: ROTATE[type] }] },
        ]}
      >
        <Text style={[styles.labelText, { color: ACCENT[type] }]}>{LABEL[type]}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius,
  },
  labelBox: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  labelText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
});
