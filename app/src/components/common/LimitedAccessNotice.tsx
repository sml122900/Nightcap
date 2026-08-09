import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { makeStyles } from '../../theme/makeStyles';
import type { Surface } from '../../theme/tokens';

interface LimitedAccessNoticeProps {
  /** Opens the system picker so the user can widen `limited` to `all`. Never called automatically. */
  onRequestFullAccess: () => void;
  /** Margins differ per host: the triage banner is inset from the deck, settings sits in the list. */
  style?: StyleProp<ViewStyle>;
  surface?: Surface;
}

/**
 * Shown only in the `limited` media-access state (Android 14+ "선택된 사진만 허용").
 *
 * The wording states the functional consequence rather than warning about it: under `limited` the
 * app only ever sees the assets the user picked, so a screenshot taken afterwards is **never**
 * collected — measured, not guessed (docs/decisions/android15-limited-media-access.md). The old
 * copy said results "may be limited", which undersold a guaranteed outcome.
 *
 * Deliberately not `danger`-colored: `limited` is a legitimate choice the user made, not an error
 * state, and their picked photos really are being collected. `textSecondary` + one action.
 *
 * Used by the triage deck, settings, and onboarding so the three can't drift apart.
 */
export function LimitedAccessNotice({ onRequestFullAccess, style, surface = 'theme' }: LimitedAccessNoticeProps) {
  const styles = useStyles(surface);
  return (
    <View style={[styles.notice, style]}>
      <Text style={styles.text}>일부 사진만 접근 중 · 새 스크린샷은 자동으로 담기지 않아요</Text>
      <Pressable
        onPress={onRequestFullAccess}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="사진 접근 전체 허용"
      >
        <Text style={styles.buttonText}>전체 허용</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: t.radius.card,
    backgroundColor: t.c.surfaceRaised,
    borderWidth: 1,
    borderColor: t.c.border,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: t.c.textSecondary,
  },
  button: {
    paddingHorizontal: t.space.md,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: t.c.accentMuted,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '800',
    color: t.c.accent,
  },
}));
