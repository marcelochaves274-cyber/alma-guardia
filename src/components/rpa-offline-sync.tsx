'use client';

import { useCallback, useEffect, useRef } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { getRpaQueue, removeRpaFromQueue } from '@/lib/rpo-offline';

export function RpaOfflineSync() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isSyncingRef = useRef(false);

  const requestBackgroundSync = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      if (!('sync' in registration)) return;
      await (registration as ServiceWorkerRegistration & {
        sync: { register: (tag: string) => Promise<void> };
      }).sync.register('rpa-offline-sync');
    } catch (error) {
      console.debug('[RPA-OFFLINE] Background Sync indisponivel:', error);
    }
  }, []);

  const syncPending = useCallback(async () => {
    if (!firestore || !user || !navigator.onLine || isSyncingRef.current) return;

    const pending = getRpaQueue().filter(item => item.userId === user.uid);
    if (pending.length === 0) return;

    isSyncingRef.current = true;
    toast({
      title: 'Sincronizando RPA',
      description: `${pending.length} relatório(s) aguardando envio.`,
    });

    let sentCount = 0;

    try {
      for (const item of pending) {
        if (!navigator.onLine) break;

        const noticeData = {
          ...item.noticeData,
          noticeDate: typeof item.noticeData.noticeDate === 'string'
            ? Timestamp.fromDate(new Date(item.noticeData.noticeDate as string))
            : Timestamp.now(),
        };

        await addDoc(collection(firestore, 'sgs_genius', user.uid, 'notices'), noticeData);
        removeRpaFromQueue(item.id);
        sentCount++;
        window.dispatchEvent(new CustomEvent('rpa-queue-changed'));
      }

      const remaining = getRpaQueue().filter(queueItem => queueItem.userId === user.uid).length;
      if (sentCount > 0 && remaining === 0) {
        toast({
          title: 'RPA sincronizado',
          description: `${sentCount} relatório(s) enviado(s) para a Central de Avisos.`,
        });
      }
    } catch (error) {
      console.error('[RPA-OFFLINE] Erro ao sincronizar fila:', error);
      toast({
        variant: 'destructive',
        title: 'RPA aguardando conexão',
        description: 'Não foi possível enviar os relatórios agora. A nova tentativa será automática.',
      });
    } finally {
      isSyncingRef.current = false;
    }
  }, [firestore, toast, user]);

  useEffect(() => {
    if (!firestore || !user) return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/rpa-offline-sw.js').catch(error => {
        console.error('[RPA-OFFLINE] Erro ao registrar service worker:', error);
      });
    }

    void syncPending();
    void requestBackgroundSync();
    window.addEventListener('online', syncPending);
    window.addEventListener('focus', syncPending);
    document.addEventListener('visibilitychange', syncPending);
    navigator.serviceWorker?.addEventListener('message', syncPendingMessage);

    const retryInterval = window.setInterval(() => {
      if (navigator.onLine && getRpaQueue().some(item => item.userId === user.uid)) {
        void syncPending();
      }
    }, 15000);

    function syncPendingMessage(event: MessageEvent) {
      if (event.data?.type === 'RPA_SYNC_REQUEST') {
        void syncPending();
      }
    }

    return () => {
      window.removeEventListener('online', syncPending);
      window.removeEventListener('focus', syncPending);
      document.removeEventListener('visibilitychange', syncPending);
      navigator.serviceWorker?.removeEventListener('message', syncPendingMessage);
      window.clearInterval(retryInterval);
    };
  }, [syncPending, firestore, user, requestBackgroundSync]);

  return null;
}
