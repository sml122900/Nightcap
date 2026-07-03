import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tokens } from '../../constants/tokens';
import { EXIT_DURATION, EXIT_EASING, EXIT_TARGETS, RATE_DOCK, ROT } from '../../constants/swipeEngine';
import { Capture, Verdict } from '../../types/capture';
import { CardContent } from './CardContent';
import { VerdictOverlay } from './VerdictOverlay';

interface ExitingCardProps {
  item: Capture;
  verdict: Verdict;
  /** drag position at release — 0,0 when triggered via button/keyboard, not a drag. Ignored for 'rate'. */
  fromX: number;
  fromY: number;
  onDone: () => void;
}

/**
 * A departing card animates independently of the deck so the next card can promote immediately.
 * 'rate' commits from the docked position (RATE_DOCK) with no label overlay — the rate-mode layer
 * already closed before this mounts, matching nightcap-prototype.html's resolveCard('rate', v).
 */
export function ExitingCard({ item, verdict, fromX, fromY, onDone }: ExitingCardProps) {
  const isRate = verdict === 'rate';
  const x = useSharedValue(isRate ? 0 : fromX);
  const y = useSharedValue(isRate ? RATE_DOCK.y : fromY);
  const rotate = useSharedValue(isRate ? 0 : fromX * ROT);
  const scale = useSharedValue(isRate ? RATE_DOCK.scale : 1);

  useEffect(() => {
    const target = EXIT_TARGETS[verdict];
    x.value = withTiming(target.x, { duration: EXIT_DURATION, easing: EXIT_EASING });
    y.value = withTiming(target.y, { duration: EXIT_DURATION, easing: EXIT_EASING });
    rotate.value = withTiming(target.rotate, { duration: EXIT_DURATION, easing: EXIT_EASING });
    scale.value = withTiming(target.scale, { duration: EXIT_DURATION, easing: EXIT_EASING }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.card, cardStyle]} pointerEvents="none">
      <CardContent item={item} />
      {isRate ? null : <VerdictOverlay type={verdict === 'hold' ? 'hold' : 'drop'} style={{ opacity: 1 }} />}
    </Animated.View>
  );
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
    zIndex: 20,
  },
});
