import * as Haptics from 'expo-haptics';
import { Verdict } from '../types/capture';

/** PROJECT.md §6 — rate = notificationSuccess, hold/drop = impactLight */
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
