import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  measure,
  runOnJS,
  SharedValue,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { tokens } from '../../constants/tokens';
import { RATE_DEFAULT_VALUE, rateValueFromRatio } from '../../constants/swipeEngine';
import { Capture } from '../../types/capture';
import { CoverImage } from '../common/CoverImage';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface RateModeLayerProps {
  item: Capture;
  /** prefill value carried over from the drag that triggered rate mode */
  prefill: number;
  onCommit: (value: number) => void;
  /** Android back button / dismiss without a verdict — the card stack is untouched */
  onCancel: () => void;
}

/**
 * Ported from nightcap-prototype.html's #rate-layer / initRateStars / enterRateMode, but
 * rendered in a real Modal instead of an absolutely-positioned zIndex layer: on Android,
 * bumping the live deck card's zIndex above this layer's didn't reliably win the native
 * z-order, so the card buried the star bar (docs/decisions/rate-mode-modal-not-docking.md).
 * A Modal renders in its own native window, so it's guaranteed to sit above the deck.
 */
export function RateModeLayer({ item, prefill, onCommit, onCancel }: RateModeLayerProps) {
  const value = useSharedValue(prefill);
  const starsRef = useAnimatedRef<Animated.View>();
  const [accessibleValue, setAccessibleValue] = useState(prefill);

  useAnimatedReaction(
    () => Math.round(value.value * 2) / 2,
    (current, previous) => {
      if (current !== previous) runOnJS(setAccessibleValue)(current);
    }
  );

  const commit = (v: number) => onCommit(v);

  const adjust = (delta: number) => {
    value.value = Math.min(5, Math.max(0.5, Math.round((value.value + delta) * 2) / 2));
  };

  const handleAccessibilityAction = (event: { nativeEvent: { actionName: string } }) => {
    if (event.nativeEvent.actionName === 'increment') adjust(0.5);
    else if (event.nativeEvent.actionName === 'decrement') adjust(-0.5);
  };

  const updateFromAbsoluteX = (absoluteX: number) => {
    'worklet';
    const layout = measure(starsRef);
    if (!layout) return;
    const ratio = (absoluteX - layout.pageX) / layout.width;
    value.value = rateValueFromRatio(Math.min(1, Math.max(0, ratio)));
  };

  const starPan = Gesture.Pan()
    .onBegin((e) => {
      updateFromAbsoluteX(e.absoluteX);
    })
    .onUpdate((e) => {
      updateFromAbsoluteX(e.absoluteX);
    })
    .onEnd(() => {
      runOnJS(commit)(value.value);
    });

  const backgroundTap = Gesture.Tap().onEnd(() => {
    runOnJS(commit)(RATE_DEFAULT_VALUE);
  });

  const valueProps = useAnimatedProps(() => ({
    text: value.value.toFixed(1),
  }));

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onCancel}>
      {/* RN's Modal renders into its own native window, outside the app's root
          GestureHandlerRootView — without this, Pan gestures here never activate
          (only plain touchables/the outer Tap fire), so star-bar drag silently no-ops. */}
      <GestureHandlerRootView style={styles.rootView}>
        <GestureDetector gesture={backgroundTap}>
          <Animated.View style={styles.layer} entering={FadeIn.duration(150)} accessibilityViewIsModal>
            <MiniPreview item={item} />
            <AnimatedTextInput
              editable={false}
              defaultValue={prefill.toFixed(1)}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              animatedProps={valueProps as any}
              style={styles.value}
              underlineColorAndroid="transparent"
            />
            <GestureDetector gesture={starPan}>
              <Animated.View
                ref={starsRef}
                style={styles.starsRow}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel="별점"
                accessibilityValue={{ min: 0.5, max: 5, now: accessibleValue }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={handleAccessibilityAction}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <RateStar key={i} index={i} value={value} />
                ))}
              </Animated.View>
            </GestureDetector>
            <Text style={styles.hint}>드래그로 조정 · 바깥을 탭하면 2.5점</Text>
            <View style={styles.a11yRow}>
              <Pressable
                onPress={() => commit(value.value)}
                style={styles.a11yBtn}
                accessibilityRole="button"
                accessibilityLabel="별점 확정"
              >
                <Text style={styles.a11yBtnText}>확정</Text>
              </Pressable>
              <Pressable
                onPress={() => commit(RATE_DEFAULT_VALUE)}
                style={styles.a11yBtn}
                accessibilityRole="button"
                accessibilityLabel="평가 생략, 2.5점으로 저장"
              >
                <Text style={styles.a11yBtnText}>평가 생략 (2.5점)</Text>
              </Pressable>
            </View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** Small stand-in for the real deck card, shown at the top of the modal (PROJECT.md §6). */
function MiniPreview({ item }: { item: Capture }) {
  return (
    <View style={styles.miniPreview} pointerEvents="none">
      <View style={styles.miniThumb}>
        {item.kind === 'drm' ? (
          <Text style={styles.miniDrmLabel}>🔒</Text>
        ) : item.imageUri ? (
          <CoverImage uri={item.imageUri} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.miniAvatar} />
        )}
      </View>
      <View style={styles.miniMeta}>
        <Text style={styles.miniTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.miniSrc} numberOfLines={1}>
          {item.app} · {item.src}
        </Text>
      </View>
    </View>
  );
}

function RateStar({ index, value }: { index: number; value: SharedValue<number> }) {
  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, (value.value - index) * 100))}%`,
  }));
  return (
    <View style={styles.starWrap}>
      <Text style={styles.starBase}>★</Text>
      <Animated.View style={[styles.starFillClip, fillStyle]}>
        <Text style={styles.starFill}>★</Text>
      </Animated.View>
    </View>
  );
}

const STAR_SIZE = 36;

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
  },
  layer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 110,
  },
  miniPreview: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    borderRadius: 16,
    padding: 12,
  },
  miniThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: tokens.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  miniAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: tokens.surface3,
  },
  miniDrmLabel: {
    fontSize: 18,
  },
  miniMeta: {
    flex: 1,
  },
  miniTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.text,
    letterSpacing: -0.2,
  },
  miniSrc: {
    marginTop: 2,
    fontSize: 12,
    color: tokens.text3,
  },
  value: {
    fontSize: 60,
    fontWeight: '800',
    color: tokens.brand,
    letterSpacing: -1,
    padding: 0,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 18,
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    borderRadius: 20,
  },
  starWrap: {
    width: STAR_SIZE,
    height: STAR_SIZE,
  },
  starBase: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: STAR_SIZE,
    fontSize: STAR_SIZE,
    lineHeight: STAR_SIZE,
    color: tokens.surface3,
    textAlign: 'center',
  },
  starFillClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  starFill: {
    width: STAR_SIZE,
    fontSize: STAR_SIZE,
    lineHeight: STAR_SIZE,
    color: tokens.brand,
    textAlign: 'left',
  },
  hint: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600',
    color: tokens.text2,
    letterSpacing: -0.1,
  },
  a11yRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  a11yBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
  },
  a11yBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: tokens.text2,
  },
});
