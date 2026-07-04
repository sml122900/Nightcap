import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tokens } from '../../constants/tokens';
import { EXIT_DURATION, EXIT_EASING, EXIT_TARGETS, ROT } from '../../constants/swipeEngine';
import { Capture } from '../../types/capture';
import { CardContent } from './CardContent';
import { VerdictOverlay } from './VerdictOverlay';

/**
 * Exit-animation direction — presentation only, decoupled from the committed Verdict.
 * A ← swipe ('hold') and the rate-mode modal's skip button both commit verdict='rate'
 * now, but they still exit differently (fly left vs fly up) (docs/decisions/hold-becomes-quick-rate.md).
 */
export type ExitKind = 'hold' | 'drop' | 'rate';

interface ExitingCardProps {
  item: Capture;
  kind: ExitKind;
  /** drag position at release — 0,0 when triggered via button/keyboard, not a drag. Ignored for 'rate'. */
  fromX: number;
  fromY: number;
  onDone: () => void;
}

/**
 * A departing card animates independently of the deck so the next card can promote immediately.
 * 'rate' commits with no label overlay — the rate-mode modal already closed before this mounts,
 * and starts from center since the deck card is never docked/transformed while rating
 * (docs/decisions/rate-mode-modal-not-docking.md), matching nightcap-prototype.html's resolveCard('rate', v).
 */
export function ExitingCard({ item, kind, fromX, fromY, onDone }: ExitingCardProps) {
  const isRate = kind === 'rate';
  const x = useSharedValue(fromX);
  const y = useSharedValue(fromY);
  const rotate = useSharedValue(fromX * ROT);
  const scale = useSharedValue(1);

  useEffect(() => {
    const target = EXIT_TARGETS[kind];
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
      {isRate ? null : <VerdictOverlay type={kind === 'hold' ? 'hold' : 'drop'} style={{ opacity: 1 }} />}
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
