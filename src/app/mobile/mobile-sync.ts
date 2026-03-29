export type MobileQueuedActionKind =
  | 'task-checklist'
  | 'quick-note'
  | 'incident'
  | 'create-thread'
  | 'send-message';

export type MobileQueuedAction = {
  id: string;
  kind: MobileQueuedActionKind;
  visitId: string;
  executionSessionId: string;
  queuedAt: string;
  payload: Record<string, unknown>;
  failureMessage?: string;
};

const MOBILE_EXECUTION_SESSION_KEY = 'hhc_mobile_execution_sessions';
const MOBILE_SYNC_QUEUE_KEY = 'hhc_mobile_sync_queue';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadMobileExecutionSessionIds(): Record<string, string> {
  return readJson<Record<string, string>>(MOBILE_EXECUTION_SESSION_KEY, {});
}

export function persistMobileExecutionSessionId(visitId: string, executionSessionId: string) {
  const next = {
    ...loadMobileExecutionSessionIds(),
    [visitId]: executionSessionId,
  };
  writeJson(MOBILE_EXECUTION_SESSION_KEY, next);
}

export function clearMobileExecutionSessionId(visitId: string) {
  const next = { ...loadMobileExecutionSessionIds() };
  delete next[visitId];
  writeJson(MOBILE_EXECUTION_SESSION_KEY, next);
}

export function loadMobileSyncQueue(): MobileQueuedAction[] {
  return readJson<MobileQueuedAction[]>(MOBILE_SYNC_QUEUE_KEY, []);
}

export function saveMobileSyncQueue(queue: MobileQueuedAction[]) {
  writeJson(MOBILE_SYNC_QUEUE_KEY, queue);
}

export function queueMobileAction(
  action: Omit<MobileQueuedAction, 'id' | 'queuedAt'>,
): MobileQueuedAction[] {
  const nextEntry: MobileQueuedAction = {
    ...action,
    id: `${action.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
  };
  const nextQueue = [...loadMobileSyncQueue(), nextEntry];
  saveMobileSyncQueue(nextQueue);
  return nextQueue;
}

export function removeQueuedMobileAction(id: string): MobileQueuedAction[] {
  const nextQueue = loadMobileSyncQueue().filter((item) => item.id !== id);
  saveMobileSyncQueue(nextQueue);
  return nextQueue;
}

export function replaceQueuedMobileAction(nextEntry: MobileQueuedAction): MobileQueuedAction[] {
  const nextQueue = loadMobileSyncQueue().map((item) =>
    item.id === nextEntry.id ? nextEntry : item,
  );
  saveMobileSyncQueue(nextQueue);
  return nextQueue;
}
