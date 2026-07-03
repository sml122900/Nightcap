import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { tokens } from '../constants/tokens';
import { applyVerdict, getTodayStack, undoVerdict } from '../db/queries';
import { resetDemoData } from '../db/seed';
import { syncPendingAssetDeletes } from '../services/trash';
import { AccessibleControls } from '../components/triage/AccessibleControls';
import { TriageDeck, TriageDeckHandle } from '../components/triage/TriageDeck';
import { DoneScreen } from './DoneScreen';
import { Capture, TriageHistoryEntry, TriageSession, Verdict } from '../types/capture';
import { fireVerdictHaptic } from '../utils/haptics';

const EMPTY_SESSION: TriageSession = { rated: 0, sum: 0, hold: 0, drop: 0, apps: {} };
const TOAST_DURATION = 1800;

function bumpApps(apps: Record<string, number>, app: string, delta: number) {
  const next = { ...apps, [app]: (apps[app] ?? 0) + delta };
  if (next[app] <= 0) delete next[app];
  return next;
}

interface TriageScreenProps {
  onOpenLibrary: () => void;
}

export function TriageScreen({ onOpenLibrary }: TriageScreenProps) {
  const db = useSQLiteContext();
  const [queue, setQueue] = useState<Capture[] | null>(null);
  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState<TriageHistoryEntry[]>([]);
  const [session, setSession] = useState<TriageSession>(EMPTY_SESSION);
  const [isRating, setIsRating] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const deckRef = useRef<TriageDeckHandle>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownDropToastRef = useRef(false);
  const syncedRef = useRef(false);

  const loadStack = useCallback(async () => {
    const stack = await getTodayStack(db);
    setQueue(stack);
    setTotal(stack.length);
  }, [db]);

  useEffect(() => {
    loadStack();
  }, [loadStack]);

  const done = queue === null ? 0 : total - queue.length;
  const current = Math.min(done + 1, total);
  const progressPct = total === 0 ? 0 : (done / total) * 100;
  const isDone = queue !== null && queue.length === 0;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), TOAST_DURATION);
  };

  const handleCommit = (item: Capture, verdict: Verdict, stars?: number) => {
    fireVerdictHaptic(verdict);
    applyVerdict(db, item.id, verdict, stars).catch((err) => console.warn('[triage] applyVerdict failed', err));
    setQueue((q) => (q ? q.slice(1) : q));
    setHistory((h) => [...h, { item, verdict, stars }]);
    setSession((s) => ({
      rated: s.rated + (verdict === 'rate' ? 1 : 0),
      sum: s.sum + (verdict === 'rate' ? stars ?? 0 : 0),
      hold: s.hold + (verdict === 'hold' ? 1 : 0),
      drop: s.drop + (verdict === 'drop' ? 1 : 0),
      apps: bumpApps(s.apps, item.app, 1),
    }));
    if (verdict === 'drop' && !shownDropToastRef.current) {
      shownDropToastRef.current = true;
      showToast('휴지통으로 이동 · 7일 뒤 완전 삭제');
    }
  };

  /** → drag / '이전' button: undo the last verdict and put that card back on top (PROJECT.md §1/§6). */
  const handlePrev = () => {
    if (history.length === 0) {
      showToast('첫 캡처예요');
      return;
    }
    const last = history[history.length - 1];
    undoVerdict(db, last.item.id, last.verdict).catch((err) => console.warn('[triage] undoVerdict failed', err));
    setHistory((h) => h.slice(0, -1));
    setQueue((q) => (q ? [last.item, ...q] : q));
    setSession((s) => ({
      rated: s.rated - (last.verdict === 'rate' ? 1 : 0),
      sum: s.sum - (last.verdict === 'rate' ? last.stars ?? 0 : 0),
      hold: s.hold - (last.verdict === 'hold' ? 1 : 0),
      drop: s.drop - (last.verdict === 'drop' ? 1 : 0),
      apps: bumpApps(s.apps, last.item.app, -1),
    }));
  };

  const handleRestart = async () => {
    await resetDemoData(db);
    shownDropToastRef.current = false;
    syncedRef.current = false;
    setHistory([]);
    setSession(EMPTY_SESSION);
    await loadStack();
  };

  useEffect(() => {
    if (!isDone || syncedRef.current) return;
    syncedRef.current = true;
    syncPendingAssetDeletes(db).catch((err) => console.warn('[triage] syncPendingAssetDeletes failed', err));
  }, [isDone, db]);

  const topApp = useMemo(() => {
    const entries = Object.entries(session.apps);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [session.apps]);

  if (queue === null) {
    return <View style={styles.screen} />;
  }

  if (isDone) {
    return (
      <DoneScreen session={session} topApp={topApp} onOpenLibrary={onOpenLibrary} onRestart={handleRestart} />
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Pressable onPress={handleRestart} hitSlop={8}>
          <Text style={styles.ghostBtn}>닫기</Text>
        </Pressable>
        <Text style={styles.count}>
          <Text style={styles.countStrong}>{current}</Text> / {total}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      <View style={styles.deckWrap}>
        <TriageDeck
          ref={deckRef}
          queue={queue}
          onCommit={handleCommit}
          onPrev={handlePrev}
          onRatingActiveChange={setIsRating}
        />
      </View>

      <View style={styles.foot}>
        <AccessibleControls
          disabled={isRating}
          onHold={() => deckRef.current?.resolveTop('hold')}
          onDrop={() => deckRef.current?.resolveTop('drop')}
          onRate={() => deckRef.current?.enterRate()}
          onPrev={handlePrev}
        />
      </View>

      {toastMsg ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(200)} style={styles.toast}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </Animated.View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  top: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ghostBtn: {
    color: tokens.text2,
    fontSize: 14,
    fontWeight: '600',
  },
  count: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.text2,
  },
  countStrong: {
    color: tokens.text,
  },
  progressTrack: {
    height: 3,
    marginHorizontal: 24,
    borderRadius: 2,
    backgroundColor: tokens.surface2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: tokens.brand,
    borderRadius: 2,
  },
  deckWrap: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
  },
  foot: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 110,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: tokens.surface3,
    borderWidth: 1,
    borderColor: tokens.borderStrong,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  toastText: {
    color: tokens.text,
    fontSize: 13.5,
    fontWeight: '700',
  },
});
