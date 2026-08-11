import * as Haptics from 'expo-haptics';
import { Verdict } from '../types/capture';

/**
 * PROJECT.md §6 — rate = notificationSuccess, drop = impactLight. The ← swipe ('hold')
 * commits as verdict='rate' now (docs/decisions/hold-becomes-quick-rate.md), so it fires
 * the rate haptic, not a separate hold one.
 */
export function fireVerdictHaptic(verdict: Verdict): void {
  if (verdict === 'rate') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/** short tick fired when entering rate mode (prototype: vibrate(10)) */
export function fireEnterRateHaptic(): void {
  void Haptics.selectionAsync();
}

/** fired once when a long-press enters library multi-select mode */
export function fireSelectionModeHaptic(): void {
  void Haptics.selectionAsync();
}
