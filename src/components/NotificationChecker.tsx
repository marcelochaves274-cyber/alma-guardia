'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { db } from '@/firebase/config';
import { collection, query, where, getDocs, Timestamp, limit } from 'firebase/firestore';
import { requestNotificationPermission } from '@/firebase/messaging';

/**
 * Este componente é projetado para ser montado em uma parte autenticada do aplicativo.
 * Ele não renderiza nada, mas executa verificações em segundo plano para pendências
 * e dispara notificações nativas do navegador se necessário.
 */
export function NotificationChecker() {
  const { user } = useUser();
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Efeito 1: Solicitar permissão de notificação assim que o componente for montado.
  useEffect(() => {
    const askForPermission = async () => {
      // Verifica se a permissão já foi concedida para não perguntar novamente.
      if (typeof window !== 'undefined' && Notification.permission === 'granted') {
        setPermissionGranted(true);
        return;
      }
      
      // Se não, solicita a permissão.
      const token = await requestNotificationPermission();
      if (token) {
        setPermissionGranted(true);
      }
    };

    askForPermission();
  }, []);

  // Efeito 2: Executar as verificações no Firestore quando o usuário estiver logado e a permissão concedida.
  useEffect(() => {
    if (!user || !permissionGranted) {
      return;
    }

    const checkPendencies = async () => {
      console.log("Verificando pendências críticas...");
      const today = new Date();
      let pendingMessages: string[] = [];

      try {
        // 1. Tratamentos de risco atrasados
        const tratamentosQuery = query(
          collection(db, "tratamentos"),
          where("situacao", "==", "pendente"),
          where("prazo", "<", Timestamp.fromDate(today)),
          limit(1)
        );
        if (!(await getDocs(tratamentosQuery)).empty) {
          pendingMessages.push("Existem tratamentos de risco atrasados.");
        }

        // 2. Vistorias de equipamentos atrasadas
        const vistoriasQuery = query(
          collection(db, "equipamentos"),
          where("data_vistoria", "<", Timestamp.fromDate(today)),
          limit(1)
        );
        if (!(await getDocs(vistoriasQuery)).empty) {
          pendingMessages.push("Existem vistorias de equipamentos vencidas.");
        }

        // 3. Equipamentos com validade expirada
        const validadeQuery = query(
          collection(db, "equipamentos"),
          where("data_validade", "<", Timestamp.fromDate(today)),
          limit(1)
        );
        if (!(await getDocs(validadeQuery)).empty) {
          pendingMessages.push("Existem equipamentos com a validade expirada.");
        }

        // 4. Avisos pendentes na central
        const avisosQuery = query(
          collection(db, "avisos"),
          where("status", "==", "pendente"),
          limit(1)
        );
        if (!(await getDocs(avisosQuery)).empty) {
          pendingMessages.push("Há novos avisos de campo pendentes de análise.");
        }

        // Se houver mensagens, dispara uma única notificação
        if (pendingMessages.length > 0) {
          new Notification("ALMA Guardia - Alerta de Pendências", {
            body: `Você tem ${pendingMessages.length} tipo(s) de alertas críticos. Verifique o painel de Lembretes.`,
            icon: 'https://firebasestorage.googleapis.com/v0/b/studio-6033207211-536c4.firebasestorage.app/o/Logo-Final-ico.ico?alt=media&token=7b88f673-93d1-4e01-a1c7-bf0da7beaa86'
          });
        }
      } catch (error) {
        console.error("Erro ao verificar pendências para notificação:", error);
      }
    };

    checkPendencies();
  }, [user, permissionGranted]);

  return null; // Este componente não renderiza nada na UI.
}