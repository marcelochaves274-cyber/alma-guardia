export interface RpoOfflineQueueItem {
  id: string;
  userId: string;
  noticeData: Record<string, unknown>;
  createdAt: string;
}

const QUEUE_KEY = 'sgs-rpa-pending-notices';

export function getRpaQueue(): RpoOfflineQueueItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const value = window.localStorage.getItem(QUEUE_KEY);
    return value ? JSON.parse(value) as RpoOfflineQueueItem[] : [];
  } catch (error) {
    console.error('Erro ao carregar a fila offline de RPA:', error);
    return [];
  }
}

export function addRpaToQueue(userId: string, noticeData: Record<string, unknown>) {
  const queue = getRpaQueue();
  const item: RpoOfflineQueueItem = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    userId,
    noticeData,
    createdAt: new Date().toISOString(),
  };

  window.localStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, item]));
  return item;
}

export function removeRpaFromQueue(itemId: string) {
  const queue = getRpaQueue();
  window.localStorage.setItem(
    QUEUE_KEY,
    JSON.stringify(queue.filter(item => item.id !== itemId))
  );
}
