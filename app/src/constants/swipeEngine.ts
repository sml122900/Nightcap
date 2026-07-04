import { Easing } from 'react-native-reanimated';

/**
 * Swipe engine spec — ported 1:1 from PROJECT.md §6 / nightcap-prototype.html.
 * 4-direction gesture map: ← hold(보류) / → prev(이전=undo) / ↓ drop(삭제) / ↑ rate mode(별점).
 * Do not retune without re-validating against the prototype's "feel".
 */

/** left/right verdict threshold, px */
export const TH_X = 92;
/** down (drop) verdict threshold, px — higher than TH_X since it's destructive */
export const TH_DOWN = 110;
/** up (enter rate mode) threshold, px */
export const TH_UP = 110;
/** rotate(deg) = dx * ROT */
export const ROT = 0.055;
/** upness = max(0, -dy - |dx| * UPNESS_DX_DAMPING), downness = max(0, dy - |dx| * UPNESS_DX_DAMPING) */
export const UPNESS_DX_DAMPING = 0.6;
/** overlays only start fading in past this drag distance */
export const OVERLAY_DEAD_ZONE = 24;

/** star-bar drag: 0.5-unit rounding, 0 is a valid ratio endpoint (min visual value 0.5) */
export function rateValueFromRatio(ratio: number): number {
  'worklet';
  return Math.max(0.5, Math.round(ratio * 5 * 2) / 2);
}

/** card release with no verdict: spring back to center, cubic-bezier(.2,1.4,.3,1) 0.4s */
export const RESTORE_SPRING = {
  duration: 400,
  dampingRatio: 0.6,
} as const;

/** verdict fly-out: 0.38s */
export const EXIT_DURATION = 380;
export const EXIT_EASING = Easing.bezier(0.3, 0.7, 0.4, 1);

export const EXIT_TARGETS = {
  hold: { x: -480, y: -30, rotate: -20, scale: 1 },
  drop: { x: 0, y: 640, rotate: 5, scale: 1 },
  rate: { x: 0, y: -660, rotate: -4, scale: 1.04 },
} as const;

/** back-of-stack cards: scale(1 - depth*STEP) translateY(depth*STEP_Y) */
export const DEPTH_SCALE_STEP = 0.045;
export const DEPTH_TRANSLATE_Y_STEP = 14;
export const DEPTH_TRANSITION_DURATION = 350;
export const DEPTH_EASING = Easing.bezier(0.2, 0.8, 0.2, 1);

/** top N cards rendered in the deck */
export const DECK_VISIBLE_DEPTH = 3;

/** tap-outside-star-bar in rate mode always commits this value */
export const RATE_DEFAULT_VALUE = 2.5;
