import React from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import Animated, { SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { tokens } from '../../constants/tokens';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type AnimatedViewStyle = React.ComponentProps<typeof Animated.View>['style'];

interface RatePreviewProps {
  /** animated {opacity} style, driven by upness during the live drag */
  style?: AnimatedViewStyle;
  /** current prefill rating, 0.5–5.0 */
  value: SharedValue<number>;
}

/** Live numeric preview shown on the card while dragging up, before crossing TH_UP into full rate mode. */
export function RatePreview({ style, value }: RatePreviewProps) {
  const animatedProps = useAnimatedProps(() => ({
    text: value.value.toFixed(1),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, { backgroundColor: tokens.brandDim }, style]}
    >
      <AnimatedTextInput
        editable={false}
        defaultValue={value.value.toFixed(1)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        animatedProps={animatedProps as any}
        style={styles.value}
        underlineColorAndroid="transparent"
      />
      <Animated.View style={[styles.labelBox, { borderColor: tokens.brand }]}>
        <Text style={[styles.labelText, { color: tokens.brand }]}>별점</Text>
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
    gap: 12,
    borderRadius: tokens.radius,
  },
  value: {
    fontSize: 54,
    fontWeight: '800',
    color: tokens.brand,
    letterSpacing: -1,
    padding: 0,
    textAlign: 'center',
  },
  labelBox: {
    borderWidth: 2,
    borderRadius: 14,
    borderColor: tokens.brand,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  labelText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
});
