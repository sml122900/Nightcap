import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tokens } from '../../constants/tokens';
import {
  DEPTH_EASING,
  DEPTH_SCALE_STEP,
  DEPTH_TRANSITION_DURATION,
  DEPTH_TRANSLATE_Y_STEP,
  OVERLAY_DEAD_ZONE,
  prefillFromUpness,
  RATE_DOCK,
  RATE_DOCK_DURATION,
  RATE_DOCK_EASING,
  RESTORE_SPRING,
  ROT,
  TH_DOWN,
  TH_UP,
  TH_X,
  UPNESS_DX_DAMPING,
} from '../../constants/swipeEngine';
import { Capture, Verdict } from '../../types/capture';
import { CardContent } from './CardContent';
import { RatePreview } from './RatePreview';
import { VerdictOverlay } from './VerdictOverlay';

interface TriageCardProps {
  item: Capture;
  depth: number;
  /** true only for the top card while rate mode is open (PROJECT.md §6 docking) */
  docked: boolean;
  onResolved: (item: Capture, verdict: Verdict, dx: number, dy: number) => void;
  onEnterRate: (item: Capture, prefill: number) => void;
  onPrev: () => void;
}

/** The live card: at rest it sits at its stack depth; at depth 0 it's draggable (PROJECT.md §6). */
export function TriageCard({ item, depth, docked, onResolved, onEnterRate, onPrev }: TriageCardProps) {
  const isTop = depth === 0;
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const depthAnim = useSharedValue(depth);
  const dockScale = useSharedValue(1);

  useEffect(() => {
    depthAnim.value = withTiming(depth, {
      duration: DEPTH_TRANSITION_DURATION,
      easing: DEPTH_EASING,
    });
  }, [depth, depthAnim]);

  useEffect(() => {
    if (docked) {
      dragX.value = withTiming(0, { duration: RATE_DOCK_DURATION, easing: RATE_DOCK_EASING });
      dragY.value = withTiming(RATE_DOCK.y, { duration: RATE_DOCK_DURATION, easing: RATE_DOCK_EASING });
      dockScale.value = withTiming(RATE_DOCK.scale, {
        duration: RATE_DOCK_DURATION,
        easing: RATE_DOCK_EASING,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docked]);

  const upness = useDerivedValue(() =>
    Math.max(0, -dragY.value - Math.abs(dragX.value) * UPNESS_DX_DAMPING)
  );
  const downness = useDerivedValue(() =>
    Math.max(0, dragY.value - Math.abs(dragX.value) * UPNESS_DX_DAMPING)
  );
  const ratePreviewValue = useDerivedValue(() => prefillFromUpness(upness.value));

  const overlayOpacities = useDerivedValue(() => {
    if (upness.value > OVERLAY_DEAD_ZONE) {
      return { hold: 0, prev: 0, drop: 0, rate: Math.min(1, upness.value / TH_UP) };
    }
    if (downness.value > OVERLAY_DEAD_ZONE) {
      return { hold: 0, prev: 0, drop: Math.min(1, downness.value / TH_DOWN), rate: 0 };
    }
    return {
      hold: dragX.value < -OVERLAY_DEAD_ZONE ? Math.min(1, -dragX.value / TH_X) : 0,
      prev: dragX.value > OVERLAY_DEAD_ZONE ? Math.min(1, dragX.value / TH_X) : 0,
      drop: 0,
      rate: 0,
    };
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: (1 - depthAnim.value * DEPTH_SCALE_STEP) * dockScale.value },
      { translateY: depthAnim.value * DEPTH_TRANSLATE_Y_STEP },
      { translateX: dragX.value },
      { translateY: dragY.value },
      { rotate: `${dragX.value * ROT}deg` },
    ],
    zIndex: docked ? 30 : 10 - depth,
  }));

  const holdStyle = useAnimatedStyle(() => ({ opacity: overlayOpacities.value.hold }));
  const prevStyle = useAnimatedStyle(() => ({ opacity: overlayOpacities.value.prev }));
  const dropStyle = useAnimatedStyle(() => ({ opacity: overlayOpacities.value.drop }));
  const rateStyle = useAnimatedStyle(() => ({ opacity: overlayOpacities.value.rate }));

  function resolve(verdict: Verdict, dx: number, dy: number) {
    onResolved(item, verdict, dx, dy);
  }

  function enterRate(prefill: number) {
    onEnterRate(item, prefill);
  }

  const pan = Gesture.Pan()
    .enabled(isTop && !docked)
    .onUpdate((e) => {
      dragX.value = e.translationX;
      dragY.value = e.translationY;
    })
    .onEnd((e) => {
      const dx = e.translationX;
      const dy = e.translationY;
      const up = Math.max(0, -dy - Math.abs(dx) * UPNESS_DX_DAMPING);
      const down = Math.max(0, dy - Math.abs(dx) * UPNESS_DX_DAMPING);

      if (up > TH_UP) {
        runOnJS(enterRate)(prefillFromUpness(up));
      } else if (down > TH_DOWN) {
        runOnJS(resolve)('drop', dx, dy);
      } else if (dx < -TH_X) {
        runOnJS(resolve)('hold', dx, dy);
      } else if (dx > TH_X) {
        dragX.value = withSpring(0, RESTORE_SPRING);
        dragY.value = withSpring(0, RESTORE_SPRING);
        runOnJS(onPrev)();
      } else {
        dragX.value = withSpring(0, RESTORE_SPRING);
        dragY.value = withSpring(0, RESTORE_SPRING);
      }
    });

  const card = (
    <Animated.View style={[styles.card, cardStyle]}>
      <CardContent item={item} />
      {isTop ? (
        <>
          <VerdictOverlay type="hold" style={holdStyle} />
          <VerdictOverlay type="prev" style={prevStyle} />
          <VerdictOverlay type="drop" style={dropStyle} />
          <RatePreview style={rateStyle} value={ratePreviewValue} />
        </>
      ) : null}
    </Animated.View>
  );

  if (!isTop) return card;
  return <GestureDetector gesture={pan}>{card}</GestureDetector>;
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: tokens.radius,
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    overflow: 'hidden',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },
});
