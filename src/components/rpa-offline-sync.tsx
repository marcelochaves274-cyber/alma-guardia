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

    void syncPending();
    window.addEventListener('online', syncPending);
    window.addEventListener('focus', syncPending);
    document.addEventListener('visibilitychange', syncPending);

    return () => {
      window.removeEventListener('online', syncPending);
      window.removeEventListener('focus', syncPending);
      document.removeEventListener('visibilitychange', syncPending);
    };
  }, [syncPending, firestore, user]);

  return null;
}
