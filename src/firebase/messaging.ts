'use client';

import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { collection, deleteDoc, doc, setDoc, getDocFromServer, waitForPendingWrites } from 'firebase/firestore';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';

// null = perfil vê todos os locais nesse módulo; array (mesmo vazio) = locais específicos permitidos.
export interface NotificationScope {
  isAdmin: boolean;
  equipmentLocations: string[] | null;
  treatmentLocations: string[] | null;
}

export const ADMIN_NOTIFICATION_SCOPE: NotificationScope = {
  isAdmin: true,
  equipmentLocations: null,
  treatmentLocations: null,
};

export async function registerForPushNotifications(
  auth: Auth,
  app: FirebaseApp,
  firestore: Firestore,
  scope: NotificationScope = ADMIN_NOTIFICATION_SCOPE
) {
  console.log('[FCM] 1. Aguardando authStateReady...');
  await auth.authStateReady();
  const currentUser = auth.currentUser;
  console.log('[FCM] 2. currentUser:', currentUser?.uid || 'nenhum usuário');
  
  if (!currentUser) {
    throw new Error('Nenhum usuário autenticado. Faça login e tente novamente.');
  }

  const publicVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  console.log('[FCM] 3. VAPID Key configurada:', !!publicVapidKey);
  if (!publicVapidKey || publicVapidKey === 'replace-with-your-public-vapid-key') {
    throw new Error('NEXT_PUBLIC_FIREBASE_VAPID_KEY não está configurada ou contém um placeholder.');
  }
  
  if (typeof window === 'undefined') {
    console.warn('[FCM] 4. Ambiente server-side');
    return null;
  }
  
  if (!window.isSecureContext) {
    throw new Error('Este endereço não é seguro. No celular, use uma URL HTTPS; http://IP:9002 não permite FCM Web.');
  }
  
  if (!('serviceWorker' in navigator)) {
    throw new Error('Este navegador não oferece Service Worker. Abra a URL no Chrome ou Safari, fora do navegador interno do WhatsApp/Instagram.');
  }
  
  if (!(await isSupported()) || !('Notification' in window)) {
    throw new Error('Este navegador não oferece FCM Web. No iPhone, use iOS 16.4+ e adicione o site à Tela de Início antes de ativar alertas.');
  }

  console.log('[FCM] 5. Registrando Service Worker...');
  let registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  // Garante que o Service Worker esteja ativo (não apenas "installing"/"waiting"),
  // caso contrário o getToken() falha com erro de credencial ausente.
  registration = await navigator.serviceWorker.ready;
  console.log('[FCM] 6. Service Worker ativo:', registration.active?.state);
  
  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  console.log('[FCM] 7. Permissão de notificação:', permission);
  
  if (permission !== 'granted') {
    const errorMessage = permission === 'denied'
      ? 'Permissão bloqueada. Para ativar:\n1. Abra as Configurações do navegador\n2. Procure por "Notificações" ou "Alertas"\n3. Permita alertas deste site\n4. Volte aqui e atualize o app.'
      : 'Você não respondeu à solicitação de permissão. Tente novamente.'
    throw new Error(errorMessage);
  }

  // Re-verificar autenticação NOVAMENTE após solicitar permissão
  console.log('[FCM] 8. Verificando autenticação novamente...');
  await auth.authStateReady();
  
  if (!auth.currentUser) {
    throw new Error('A sessão expirou. Faça login novamente.');
  }
  
  if (auth.currentUser.uid !== currentUser.uid) {
    throw new Error('A sessão mudou durante a ativação das notificações. Tente novamente.');
  }
  
  console.log('[FCM] 9. Obtendo messaging instance...');
  const messaging = getMessaging(app);
  const usedApiKey = app.options.apiKey || '(vazio)';
  console.log('[FCM] 9a. App em uso -> apiKey final:', usedApiKey, '| appId:', app.options.appId, '| projectId:', app.options.projectId);
  
  console.log('[FCM] 10. Solicitando token FCM...');
  let token: string | null = null;
  
  try {
    token = await getToken(messaging, {
      vapidKey: publicVapidKey,
      serviceWorkerRegistration: registration,
    });
  } catch (tokenError) {
    // Logo após limpar dados do site, o Firebase Installations pode ainda não estar pronto; tenta 1x de novo.
    console.warn('[FCM] Primeira tentativa de obter token falhou, tentando novamente em 2s:', tokenError);
    await delay(2000);
    try {
      token = await getToken(messaging, {
        vapidKey: publicVapidKey,
        serviceWorkerRegistration: registration,
      });
    } catch (retryError) {
      console.error('[FCM] Erro ao obter token (após retry):', retryError);
      const keyTail = usedApiKey.slice(-6);
      throw new Error(`Falha ao obter token FCM: ${retryError instanceof Error ? retryError.message : 'erro desconhecido'} [apiKey ...${keyTail}]`);
    }
  }
  
  console.log('[FCM] 11. Token obtido:', token || 'nenhum token');
  
  if (!token) {
    throw new Error('Não foi possível gerar token FCM. Tente novamente.');
  }

  console.log('[FCM] 12. Salvando token no Firestore para uid:', currentUser.uid);
  console.log('[FCM] 12a. Caminho esperado: sgs_genius/' + currentUser.uid + '/fcmTokens/' + token);
  
  const STORAGE_KEY = 'alma-guardia-fcm-token';
  const previousToken = window.localStorage.getItem(STORAGE_KEY);
  
  try {
    const tokenRef = doc(collection(firestore, 'sgs_genius', currentUser.uid, 'fcmTokens'), token);
    console.log('[FCM] 12b. Referência criada, salvando...');
    await setDoc(tokenRef, {
      token,
      updatedAt: new Date().toISOString(),
      profileScope: scope.isAdmin ? 'admin' : 'custom',
      equipmentLocations: scope.equipmentLocations,
      treatmentLocations: scope.treatmentLocations,
    });
    console.log('[FCM] 12c. setDoc retornou com sucesso (cache local), aguardando confirmação do servidor...');
    
    // Garante que a escrita realmente chegou ao servidor antes de confirmar sucesso (rede móvel/túnel pode cair).
    await waitForPendingWrites(firestore);
    const savedDoc = await getDocFromServer(tokenRef);
    if (savedDoc.exists()) {
      console.log('[FCM] 12e. ✅ Token confirmado no servidor:', savedDoc.data());
    } else {
      throw new Error('O token não foi confirmado no servidor. Verifique sua conexão e tente novamente.');
    }
  } catch (saveError) {
    console.error('[FCM] Erro ao salvar token no Firestore:', saveError);
    throw new Error(`Falha ao salvar token: ${saveError instanceof Error ? saveError.message : 'erro desconhecido'}`);
  }
  
  // Remove o token anterior deste mesmo navegador para não receber notificações duplicadas.
  if (previousToken && previousToken !== token) {
    console.log('[FCM] 12f. Removendo token antigo deste navegador:', previousToken);
    await deleteDoc(doc(firestore, 'sgs_genius', currentUser.uid, 'fcmTokens', previousToken)).catch((removeError) => {
      console.warn('[FCM] Não foi possível remover o token antigo:', removeError);
    });
  }
  window.localStorage.setItem(STORAGE_KEY, token);
  
  console.log('[FCM] 13. Token salvo com sucesso!');
  return token;
}

export function subscribeToForegroundMessages(app: FirebaseApp, handler: (title: string, body: string) => void) {
  let unsubscribe: (() => void) | undefined;
  void isSupported().then((supported) => {
    if (supported) unsubscribe = onMessage(getMessaging(app), (payload) => {
      const notification = payload.notification;
      if (notification) handler(notification.title || 'ALMA Guardia', notification.body || '');
    });
  });
  return () => unsubscribe?.();
}

export async function removePushToken(firestore: Firestore, userId: string, token: string) {
  await deleteDoc(doc(firestore, 'sgs_genius', userId, 'fcmTokens', token));
}