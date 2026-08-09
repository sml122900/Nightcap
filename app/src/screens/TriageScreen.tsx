import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { makeStyles } from '../theme/makeStyles';
import { SystemBars } from '../theme/SystemBars';
import { HeaderButton, HeaderSpacer } from '../components/common/HeaderButton';
import { useCinema } from '../theme/ThemeProvider';
import {
  applyVerdict,
  getRatedCount,
  getTodayStack,
  getTodayStackCount,
  SHARE_CARD_MIN_ITEMS,
  undoVerdict,
} from '../db/queries';
import { resetDemoData } from '../db/seed';
import { enqueueWrite } from '../db/writeQueue';
import {
  addSessionCards,
  bumpSessionCounter,
  endTriageSession,
  SessionCounter,
  startTriageSession,
} from '../services/metrics';
import {
  getMediaAccess,
  MediaAccess,
  presentAccessPicker,
  scanNewScreenshots,
} from '../services/screenshotScan';
import { syncPendingAssetDeletes } from '../services/trash';
import { getAutoScanEnabled } from '../services/settings';
import { AccessibleControls } from '../components/triage/AccessibleControls';
import { PartialAccessBanner } from '../components/triage/PartialAccessBanner';
import { TriageDeck, TriageDeckHandle } from '../components/triage/TriageDeck';
import { DoneScreen } from './DoneScreen';
import { Capture, TriageHistoryEntry, TriageSession, Verdict } from '../types/capture';
import { fireVerdictHaptic } from '../utils/haptics';

const EMPTY_SESSION: TriageSession = { rated: 0, sum: 0, drop: 0, apps: {} };
const TOAST_DURATION = 1800;
/** Backgrounded longer than this and the return counts as a new triage session, not a resumed one. */
const SESSION_BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000;

function counterFor(verdict: Verdict, quickHold?: boolean): SessionCounter {
  if (verdict === 'drop') return 'deleted';
  return quickHold ? 'deferred' : 'kept';
}

function bumpApps(apps: Record<string, number>, app: string, delta: number) {
  const next = { ...apps, [app]: (apps[app] ?? 0) + delta };
  if (next[app] <= 0) delete next[app];
  return next;
}

interface TriageScreenProps {
  onOpenLibrary: () => void;
  /** top-bar "닫기" — exits back to the home screen; untriaged rows stay in the stack for next time */
  onExit: () => void;
  /** 완료 요약에서 공유 카드로 (W3-3 D) */
  onOpenShareCard: () => void;
}

export function TriageScreen({ onOpenLibrary, onExit, onOpenShareCard }: TriageScreenProps) {
  // The whole deck screen is a cinema surface — content is the subject here, so it stays dark
  // even when the app theme is light (핸드오프 §1-1, §4).
  const styles = useStyles('cinema');
  const theme = useCinema();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<Capture[] | null>(null);
  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState<TriageHistoryEntry[]>([]);
  const [session, setSession] = useState<TriageSession>(EMPTY_SESSION);
  const [isRating, setIsRating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [access, setAccess] = useState<MediaAccess | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ratedCount, setRatedCount] = useState(0);
  const deckRef = useRef<TriageDeckHandle>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownDropToastRef = useRef(false);
  const syncedRef = useRef(false);
  const isRatingRef = useRef(isRating);
  const isDraggingRef = useRef(isDragging);
  const pendingMergeRef = useRef<(() => void) | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const backgroundedAtRef = useRef<number | null>(null);

  const loadStack = useCallback(async () => {
    const stack = await getTodayStack(db);
    setQueue(stack);
    setTotal(stack.length);
  }, [db]);

  useEffect(() => {
    loadStack();
  }, [loadStack]);

  /**
   * Dogfooding instrumentation (W3-3 A-2): one row per visit to this screen. The unmount close is
   * always `completed=false`; reaching the done screen writes `completed=1` first and
   * `endTriageSession` won't overwrite an already-closed row, so a normal finish stays a finish.
   */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const id = await startTriageSession(db, await getTodayStackCount(db));
        if (!mounted) {
          endTriageSession(db, id, false);
          return;
        }
        sessionIdRef.current = id;
      } catch (err) {
        console.warn('[triage] session start failed', err);
      }
    })();
    return () => {
      mounted = false;
      if (sessionIdRef.current !== null) endTriageSession(db, sessionIdRef.current, false);
    };
  }, [db]);

  useEffect(() => {
    isRatingRef.current = isRating;
  }, [isRating]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  /**
   * Scan results are appended, not swapped in via `loadStack()` — a full replace would reset
   * the in-progress position (`done`/current card) and could remount the top card mid-gesture.
   * Only genuinely new rows (not already in `queue`) are appended to the tail; `total` grows by
   * that count so the N/M counter's denominator moves but the numerator doesn't.
   */
  const mergeNewCaptures = useCallback(async () => {
    const fresh = await getTodayStack(db);
    const flush = () => {
      setQueue((q) => {
        if (!q) return q;
        const existingIds = new Set(q.map((c) => c.id));
        const newItems = fresh.filter((c) => !existingIds.has(c.id));
        if (newItems.length === 0) return q;
        setTotal((t) => t + newItems.length);
        if (sessionIdRef.current !== null) addSessionCards(db, sessionIdRef.current, newItems.length);
        return [...q, ...newItems];
      });
    };
    // Defer while the user is mid-swipe or in the rate-mode modal so the merge can't land on
    // top of an active gesture; the flush effect below runs it once both clear.
    if (isRatingRef.current || isDraggingRef.current) {
      pendingMergeRef.current = flush;
    } else {
      flush();
    }
  }, [db]);

  useEffect(() => {
    if (!isRating && !isDragging && pendingMergeRef.current) {
      const flush = pendingMergeRef.current;
      pendingMergeRef.current = null;
      flush();
    }
  }, [isRating, isDragging]);

  const runScanAndMerge = useCallback(async () => {
    setScanning(true);
    try {
      await scanNewScreenshots(db);
      await mergeNewCaptures();
    } finally {
      setScanning(false);
    }
  }, [db, mergeNewCaptures]);

  // Scan is intentionally not part of initDb (see db/init.ts) so it never delays first render —
  // `loadStack` above already shows whatever's in the DB immediately; the scan's results arrive
  // later via the append-only merge.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const enabled = await getAutoScanEnabled(db);
      if (cancelled || !enabled) return;
      // Read only to drive the partial-access banner. Whether the scan may run is decided inside
      // `scanNewScreenshots`, which returns silently when access is denied — the deck itself no
      // longer depends on photo permission at all.
      const current = await getMediaAccess();
      if (cancelled) return;
      setAccess(current);
      await runScanAndMerge();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        backgroundedAtRef.current = Date.now();
        return;
      }
      // Away long enough that this isn't the same sitting any more — close the old session as a
      // drop-off and open a fresh one for whatever's still in the stack (W3-3 A-2).
      const awayFor = backgroundedAtRef.current === null ? 0 : Date.now() - backgroundedAtRef.current;
      backgroundedAtRef.current = null;
      if (awayFor > SESSION_BACKGROUND_TIMEOUT_MS && sessionIdRef.current !== null) {
        endTriageSession(db, sessionIdRef.current, false);
        sessionIdRef.current = null;
        (async () => {
          try {
            sessionIdRef.current = await startTriageSession(db, await getTodayStackCount(db));
          } catch (err) {
            console.warn('[triage] session restart failed', err);
          }
        })();
      }
      (async () => {
        const enabled = await getAutoScanEnabled(db);
        if (!enabled) return;
        setAccess(await getMediaAccess());
        await runScanAndMerge();
      })();
    });
    return () => sub.remove();
  }, [runScanAndMerge, db]);

  const handleRequestFullAccess = async () => {
    await presentAccessPicker();
    const current = await getMediaAccess();
    setAccess(current);
    if (current !== 'none') runScanAndMerge();
  };

  /** DRM card title input (PROJECT.md §3.4/§5) — updates the live card immediately, persists async. */
  const handleTitleChange = (id: string, title: string) => {
    setQueue((q) => q?.map((c) => (c.id === id ? { ...c, title } : c)) ?? q);
    enqueueWrite(id, async () => {
      await db.runAsync('UPDATE captures SET title = ? WHERE id = ?', title, id);
    }).catch((err) => console.warn('[triage] title update failed', err));
  };

  const done = queue === null ? 0 : total - queue.length;
  const current = Math.min(done + 1, total);
  const progressPct = total === 0 ? 0 : (done / total) * 100;
  const isDone = queue !== null && queue.length === 0;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), TOAST_DURATION);
  };

  const handleCommit = (item: Capture, verdict: Verdict, stars?: number, quickHold?: boolean) => {
    fireVerdictHaptic(verdict);
    if (sessionIdRef.current !== null) bumpSessionCounter(db, sessionIdRef.current, counterFor(verdict, quickHold), 1);
    // Serialized per-item (not just fire-and-forget) so a same-item undo issued right
    // after can't race ahead of this write and land first (see docs/troubleshooting).
    enqueueWrite(item.id, () => applyVerdict(db, item.id, verdict, stars)).catch((err) =>
      console.warn('[triage] applyVerdict failed', err)
    );
    setQueue((q) => (q ? q.slice(1) : q));
    setHistory((h) => [...h, { item, verdict, stars, quickHold }]);
    setSession((s) => ({
      rated: s.rated + (verdict === 'rate' ? 1 : 0),
      sum: s.sum + (verdict === 'rate' ? stars ?? 0 : 0),
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
    if (sessionIdRef.current !== null) {
      bumpSessionCounter(db, sessionIdRef.current, counterFor(last.verdict, last.quickHold), -1);
    }
    enqueueWrite(last.item.id, () => undoVerdict(db, last.item.id)).catch((err) =>
      console.warn('[triage] undoVerdict failed', err)
    );
    setHistory((h) => h.slice(0, -1));
    setQueue((q) => (q ? [last.item, ...q] : q));
    setSession((s) => ({
      rated: s.rated - (last.verdict === 'rate' ? 1 : 0),
      sum: s.sum - (last.verdict === 'rate' ? last.stars ?? 0 : 0),
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
    if (sessionIdRef.current !== null) endTriageSession(db, sessionIdRef.current, true);
    getRatedCount(db)
      .then(setRatedCount)
      .catch((err) => console.warn('[triage] rated count failed', err));
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
      <DoneScreen
        session={session}
        topApp={topApp}
        onOpenLibrary={onOpenLibrary}
        onRestart={handleRestart}
        onOpenShareCard={ratedCount >= SHARE_CARD_MIN_ITEMS ? onOpenShareCard : undefined}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SystemBars surface="cinema" />
      <View style={styles.top}>
        <HeaderButton label="닫기" onPress={onExit} surface="cinema" />
        <Text style={styles.count}>
          <Text style={styles.countStrong}>{current}</Text> / {total}
        </Text>
        {scanning ? (
          <ActivityIndicator size="small" color={theme.c.textSecondary} />
        ) : (
          <HeaderSpacer />
        )}
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      {access === 'limited' ? (
        <PartialAccessBanner onRequestFullAccess={handleRequestFullAccess} />
      ) : null}

      <View style={styles.deckWrap}>
        <TriageDeck
          ref={deckRef}
          queue={queue}
          onCommit={handleCommit}
          onPrev={handlePrev}
          onRatingActiveChange={setIsRating}
          onDragActiveChange={setIsDragging}
          onTitleChange={handleTitleChange}
        />
      </View>

      <View style={[styles.foot, { paddingBottom: insets.bottom + 24 }]}>
        <AccessibleControls
          disabled={isRating}
          onHold={() => deckRef.current?.resolveTop('hold')}
          onDrop={() => deckRef.current?.resolveTop('drop')}
          onRate={() => deckRef.current?.enterRate()}
          onPrev={handlePrev}
        />
      </View>

      {toastMsg ? (
        <View style={[styles.toastWrap, { bottom: insets.bottom + 110 }]} pointerEvents="none">
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(200)} style={styles.toast}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </Animated.View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.c.bg,
  },
  top: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: {
    fontSize: 14,
    fontWeight: '700',
    color: t.c.textSecondary,
  },
  countStrong: {
    color: t.c.textPrimary,
  },
  progressTrack: {
    height: 3,
    marginHorizontal: 24,
    borderRadius: 2,
    backgroundColor: t.c.surfaceRaised,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: t.c.accent,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: t.c.border,
    borderWidth: 1,
    borderColor: t.c.border,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  toastText: {
    color: t.c.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
}));
