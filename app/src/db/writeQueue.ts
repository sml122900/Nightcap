const queues = new Map<string, Promise<void>>();

/**
 * Serializes fire-and-forget DB writes per key (capture id) so a verdict write and its
 * undo — issued in quick succession without awaiting — can't land out of order and leave
 * the row in the wrong state (e.g. drop → immediate undo leaving the row stuck in trash).
 * Stays fire-and-forget at the call site: callers don't await the returned promise.
 */
export function enqueueWrite(key: string, write: () => Promise<void>): Promise<void> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(write);
  queues.set(key, next);
  return next;
}
