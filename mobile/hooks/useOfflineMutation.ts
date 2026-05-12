import { useCallback, useRef } from 'react';
import { MMKV } from 'react-native-mmkv';
import { isOnline } from '@/lib/offline';

const store = new MMKV({ id: 'bh_mutation_queue' });
const QUEUE_KEY = 'pending_mutations';

interface QueuedMutation {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: unknown;
  idempotencyKey: string;
  queuedAt: number;
}

function loadQueue(): QueuedMutation[] {
  try {
    const raw = store.getString(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedMutation[]): void {
  store.set(QUEUE_KEY, JSON.stringify(queue));
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useOfflineMutation<TBody>(
  executor: (body: TBody) => Promise<void>,
  endpoint: string,
) {
  const queueRef = useRef(loadQueue());

  const enqueue = useCallback(
    async (body: TBody): Promise<void> => {
      const mutation: QueuedMutation = {
        id: generateId(),
        endpoint,
        method: 'POST',
        body,
        idempotencyKey: generateId(),
        queuedAt: Date.now(),
      };
      queueRef.current.push(mutation);
      saveQueue(queueRef.current);
    },
    [endpoint],
  );

  const execute = useCallback(
    async (body: TBody): Promise<void> => {
      if (!isOnline()) {
        await enqueue(body);
        return;
      }
      await executor(body);
    },
    [executor, enqueue],
  );

  const replayQueue = useCallback(async (): Promise<void> => {
    if (!isOnline()) return;
    const queue = loadQueue();
    if (!queue.length) return;

    const remaining: QueuedMutation[] = [];
    for (const mutation of queue) {
      try {
        await executor(mutation.body as TBody);
      } catch {
        remaining.push(mutation);
      }
    }

    queueRef.current = remaining;
    saveQueue(remaining);
  }, [executor]);

  return { execute, replayQueue, pendingCount: queueRef.current.length };
}
