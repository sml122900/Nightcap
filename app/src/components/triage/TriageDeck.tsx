import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../constants/tokens';
import { DECK_VISIBLE_DEPTH, RATE_DEFAULT_VALUE } from '../../constants/swipeEngine';
import { Capture, GestureAction, Verdict } from '../../types/capture';
import { fireEnterRateHaptic } from '../../utils/haptics';
import { ExitingCard, ExitKind } from './ExitingCard';
import { RateModeLayer } from './RateModeLayer';
import { TriageCard } from './TriageCard';

export interface TriageDeckHandle {
  /** resolve the current top card without a drag — used by the a11y buttons (보류/삭제) */
  resolveTop: (action: GestureAction) => void;
  /** open rate mode on the current top card — used by the a11y 별점 button */
  enterRate: (prefill?: number) => void;
}

interface TriageDeckProps {
  queue: Capture[];
  /**
   * commits the verdict to app state (queue/history/session) + fires haptics. `quickHold` marks
   * the ← swipe's instant rate@2.5 so the metrics layer can still tell "보류" apart from a real
   * rate-mode 2.5 — the two are otherwise identical verdicts (docs/decisions/hold-becomes-quick-rate.md).
   */
  onCommit: (item: Capture, verdict: Verdict, stars?: number, quickHold?: boolean) => void;
  /** → drag / 이전 button: undo the last verdict (owned by the screen's history stack) */
  onPrev: () => void;
  /** lets the screen disable other controls while the rate-mode modal is open */
  onRatingActiveChange?: (active: boolean) => void;
  /** top card only: reports pan-gesture start/end so the screen can defer a scan-result merge mid-drag */
  onDragActiveChange?: (active: boolean) => void;
  /** DRM cards have no image — the user types the title in directly (PROJECT.md §3.4/§5) */
  onTitleChange?: (id: string, title: string) => void;
}

interface ExitEntry {
  key: string;
  item: Capture;
  /** exit-animation direction only — decoupled from the committed Verdict (docs/decisions/hold-becomes-quick-rate.md) */
  kind: ExitKind;
  fromX: number;
  fromY: number;
}

interface RatingState {
  item: Capture;
  prefill: number;
}

export const TriageDeck = forwardRef<TriageDeckHandle, TriageDeckProps>(function TriageDeck(
  { queue, onCommit, onPrev, onRatingActiveChange, onDragActiveChange, onTitleChange },
  ref
) {
  const [exiting, setExiting] = useState<ExitEntry[]>([]);
  const [rating, setRating] = useState<RatingState | null>(null);
  const exitCounter = useRef(0);

  useEffect(() => {
    onRatingActiveChange?.(rating !== null);
  }, [rating, onRatingActiveChange]);

  const handleResolved = useCallback(
    (item: Capture, action: GestureAction, dx: number, dy: number) => {
      const key = `${item.id}-${exitCounter.current++}`;
      setExiting((prev) => [...prev, { key, item, kind: action, fromX: dx, fromY: dy }]);
      // '보류'(← swipe) no longer defers to tomorrow — it commits an instant rate@2.5
      // so triage stays a single quick pass (docs/decisions/hold-becomes-quick-rate.md).
      if (action === 'hold') {
        onCommit(item, 'rate', RATE_DEFAULT_VALUE, true);
      } else {
        onCommit(item, action);
      }
    },
    [onCommit]
  );

  const handleEnterRate = useCallback((item: Capture, prefill: number) => {
    fireEnterRateHaptic();
    setRating({ item, prefill });
  }, []);

  const handleCommitRating = useCallback(
    (value: number) => {
      if (!rating) return;
      const item = rating.item;
      const key = `${item.id}-${exitCounter.current++}`;
      setExiting((prev) => [...prev, { key, item, kind: 'rate', fromX: 0, fromY: 0 }]);
      setRating(null);
      onCommit(item, 'rate', value);
    },
    [rating, onCommit]
  );

  /** Android back button / modal dismiss with no verdict — card stays on top of the deck. */
  const handleCancelRating = useCallback(() => {
    setRating(null);
  }, []);

  const removeExiting = useCallback((key: string) => {
    setExiting((prev) => prev.filter((e) => e.key !== key));
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      resolveTop: (action: GestureAction) => {
        if (rating) return;
        const top = queue[0];
        if (!top) return;
        handleResolved(top, action, 0, 0);
      },
      enterRate: (prefill = RATE_DEFAULT_VALUE) => {
        if (rating) return;
        const top = queue[0];
        if (!top) return;
        handleEnterRate(top, prefill);
      },
    }),
    [queue, rating, handleResolved, handleEnterRate]
  );

  const visible = queue.slice(0, DECK_VISIBLE_DEPTH);

  return (
    <View style={styles.deck}>
      {visible.length === 0 && exiting.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>오늘 정리 끝</Text>
        </View>
      ) : null}
      {visible
        .slice()
        .reverse()
        .map((item, i, arr) => {
          const depth = arr.length - 1 - i;
          return (
            <TriageCard
              key={item.id}
              item={item}
              depth={depth}
              ratingActive={depth === 0 && rating !== null}
              onResolved={handleResolved}
              onEnterRate={handleEnterRate}
              onPrev={onPrev}
              onTitleChange={onTitleChange}
              onDragActiveChange={depth === 0 ? onDragActiveChange : undefined}
            />
          );
        })}
      {rating ? (
        <RateModeLayer
          item={rating.item}
          prefill={rating.prefill}
          onCommit={handleCommitRating}
          onCancel={handleCancelRating}
        />
      ) : null}
      {exiting.map((e) => (
        <ExitingCard
          key={e.key}
          item={e.item}
          kind={e.kind}
          fromX={e.fromX}
          fromY={e.fromY}
          onDone={() => removeExiting(e.key)}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  deck: {
    flex: 1,
    position: 'relative',
  },
  empty: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: tokens.text3,
    fontSize: 14,
    fontWeight: '600',
  },
});
