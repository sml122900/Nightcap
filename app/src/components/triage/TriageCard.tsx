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
import { makeStyles } from '../../theme/makeStyles';
import {
  DEPTH_EASING,
  DEPTH_SCALE_STEP,
  DEPTH_TRANSITION_DURATION,
  DEPTH_TRANSLATE_Y_STEP,
  OVERLAY_DEAD_ZONE,
  RATE_DEFAULT_VALUE,
  RESTORE_SPRING,
  ROT,
  TH_DOWN,
  TH_UP,
  TH_X,
  UPNESS_DX_DAMPING,
} from '../../constants/swipeEngine';
import { Capture, GestureAction } from '../../types/capture';
import { CardContent } from './CardContent';
import { VerdictOverlay } from './VerdictOverlay';

interface TriageCardProps {
  item: Capture;
  depth: number;
  /** true only for the top card while the rate-mode modal is open (docs/decisions/rate-mode-modal-not-docking.md) */
  ratingActive: boolean;
  onResolved: (item: Capture, action: GestureAction, dx: number, dy: number) => void;
  onEnterRate: (item: Capture, prefill: number) => void;
  onPrev: () => void;
  onTitleChange?: (id: string, title: string) => void;
  /** top card only: reports pan-gesture start/end so the screen can defer a scan-result merge mid-drag */
  onDragActiveChange?: (active: boolean) => void;
}

/** The live card: at rest it sits at its stack depth; at depth 0 it's draggable (PROJECT.md §6). */
export function TriageCard({
  item,
  depth,
  ratingActive,
  onResolved,
  onEnterRate,
  onPrev,
  onTitleChange,
  onDragActiveChange,
}: TriageCardProps) {
  const styles = useStyles('cinema');
  const isTop = depth === 0;
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const depthAnim = useSharedValue(depth);

  useEffect(() => {
    depthAnim.value = withTiming(depth, {
      duration: DEPTH_TRANSITION_DURATION,
      easing: DEPTH_EASING,
    });
  }, [depth, depthAnim]);

  useEffect(() => {
    // Defensive reset for the a11y "별점" button path, which enters rate mode without a
    // drag — the pan handler's own reset (below) covers the gesture path.
    if (ratingActive) {
      dragX.value = withSpring(0, RESTORE_SPRING);
      dragY.value = withSpring(0, RESTORE_SPRING);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratingActive]);

  const upness = useDerivedValue(() =>
    Math.max(0, -dragY.value - Math.abs(dragX.value) * UPNESS_DX_DAMPING)
  );
  const downness = useDerivedValue(() =>
    Math.max(0, dragY.value - Math.abs(dragX.value) * UPNESS_DX_DAMPING)
  );

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
      { scale: 1 - depthAnim.value * DEPTH_SCALE_STEP },
      { translateY: depthAnim.value * DEPTH_TRANSLATE_Y_STEP },
      { translateX: dragX.value },
      { translateY: dragY.value },
      { rotate: `${dragX.value * ROT}deg` },
    ],
    zIndex: 10 - depth,
  }));

  const holdStyle = useAnimatedStyle(() => ({ opacity: overlayOpacities.value.hold }));
  const prevStyle = useAnimatedStyle(() => ({ opacity: overlayOpacities.value.prev }));
  const dropStyle = useAnimatedStyle(() => ({ opacity: overlayOpacities.value.drop }));
  const rateStyle = useAnimatedStyle(() => ({ opacity: overlayOpacities.value.rate }));

  function resolve(action: GestureAction, dx: number, dy: number) {
    onResolved(item, action, dx, dy);
  }

  function enterRate(prefill: number) {
    onEnterRate(item, prefill);
  }

  const pan = Gesture.Pan()
    .enabled(isTop && !ratingActive)
    .onStart(() => {
      if (onDragActiveChange) runOnJS(onDragActiveChange)(true);
    })
    .onFinalize(() => {
      if (onDragActiveChange) runOnJS(onDragActiveChange)(false);
    })
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
        // Rate mode always starts at the skip-default (2.5), never a flick-derived
        // prefill — a fixed drag distance (TH_UP..deck height) can't linearly span
        // 0.5..5.0, so any prefill mapping made 5.0 unreachable by flick alone.
        // Reset the drag so the "rate" verdict-overlay opacity (derived from dragX/dragY)
        // doesn't linger once the modal opens on top of this card.
        dragX.value = withSpring(0, RESTORE_SPRING);
        dragY.value = withSpring(0, RESTORE_SPRING);
        runOnJS(enterRate)(RATE_DEFAULT_VALUE);
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
      <CardContent item={item} onTitleChange={onTitleChange} />
      {isTop ? (
        <>
          <VerdictOverlay type="hold" style={holdStyle} />
          <VerdictOverlay type="prev" style={prevStyle} />
          <VerdictOverlay type="drop" style={dropStyle} />
          <VerdictOverlay type="rate" style={rateStyle} />
        </>
      ) : null}
    </Animated.View>
  );

  if (!isTop) return card;
  return <GestureDetector gesture={pan}>{card}</GestureDetector>;
}

const useStyles = makeStyles((t) => ({
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: t.radius.sheet,
    backgroundColor: t.c.surface,
    borderWidth: 1,
    borderColor: t.c.border,
    overflow: 'hidden',
    flexDirection: 'column',
    // Kept despite the "no shadow on dark" rule: this one isn't depth decoration, it's what
    // separates the stacked cards from each other and from the deck background.
    shadowColor: t.c.shadowColor,
    shadowOpacity: 0.55,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },
}));
